import {
  CustomerMatchSuggestion,
  CustomerAliasRecord,
  CustomerProductPriceRecord,
  CustomerRecord,
  JotformAnswer,
  JotformFieldConfig,
  JotformSubmission,
  JotformSyncRepository,
  OrderRequestInsert,
  OrderRequestLineInsert,
  ParsedOrderInput,
  ParsedOrderLineInput,
  ProductRecord,
  SyncResult,
} from "./jotform-types";

const DEFAULT_PAGE_SIZE = 100;
const JOTFORM_BASE = "https://eu-api.jotform.com";
const DEFAULT_MIN_CREATED_AT = "2026-03-16T00:00:00+01:00";

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " og ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeCompact(value: string | null | undefined) {
  return normalize(value).replace(/\s+/g, "");
}

function stripCompanyNoise(value: string | null | undefined) {
  return normalize(value)
    .replace(
      /\b(aps|a s|a\/s|as|ivs|p s|p\/s|ps|holding|advokatpartnerselskab|advokatfirma|rengoring|rengøring|piccoteam|afdeling|afd|kontor|privat|akut|med|tillaeg|tillag)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractProductNumberFromLabel(value: string | null | undefined) {
  if (!value) return null;

  const patterns = [
    /varenr\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-./]*)/i,
    /vare nr\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-./]*)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function stripProductNumberFromLabel(value: string | null | undefined) {
  if (!value) return null;

  const cleaned = value
    .replace(/\s*[-–]?\s*varenr\.?.*$/i, "")
    .replace(/\s*[-–]?\s*vare nr\.?.*$/i, "")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function isInventoryWidget(answer: JotformAnswer) {
  return answer.type === "control_widget";
}

function isMeaningfulQuantity(value: number | null) {
  return value !== null && Number.isFinite(value) && value > 0;
}

function tryParseInventoryWidgetLines(
  answers: Record<string, JotformAnswer>
): ParsedOrderLineInput[] {
  return Object.entries(answers)
    .filter(([, answer]) => isInventoryWidget(answer) && isMeaningfulQuantity(extractNumber(answer.answer)))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([key, answer], index) => {
      const label = extractText(answer.answer) ? answer.text : answer.text;
      const rawProductNumber =
        extractProductNumberFromLabel(answer.text) ??
        extractProductNumberFromLabel(answer.name);
      const rawProductName =
        stripProductNumberFromLabel(answer.text) ??
        stripProductNumberFromLabel(answer.name) ??
        null;

      return {
        lineNumber: index + 1,
        rawProductNumber,
        rawProductName,
        quantity: extractNumber(answer.answer),
        unit: null,
        sourceFieldKey: key,
      };
    });
}

function scoreCustomerCandidate(label: string, customerName: string) {
  const labelNormalized = normalize(label);
  const customerNormalized = normalize(customerName);
  const labelCompact = normalizeCompact(label);
  const customerCompact = normalizeCompact(customerName);
  const labelStripped = stripCompanyNoise(label);
  const customerStripped = stripCompanyNoise(customerName);

  if (!labelNormalized || !customerNormalized) {
    return null;
  }

  if (labelNormalized === customerNormalized || labelCompact === customerCompact) {
    return { score: 100, reason: "Eksakt normaliseret match" };
  }

  if (labelStripped && customerStripped && labelStripped === customerStripped) {
    return { score: 97, reason: "Match uden selskabs-/driftsord" };
  }

  if (customerStripped && labelStripped.includes(customerStripped)) {
    return { score: 92, reason: "Jotform-navn indeholder kundens kerneord" };
  }

  if (labelStripped && customerStripped.includes(labelStripped)) {
    return { score: 90, reason: "Kundens navn indeholder Jotform-navnet" };
  }

  const labelTokens = new Set(labelStripped.split(" ").filter((token) => token.length > 2));
  const customerTokens = customerStripped.split(" ").filter((token) => token.length > 2);
  const overlap = customerTokens.filter((token) => labelTokens.has(token));

  if (overlap.length >= 2) {
    return {
      score: 80 + overlap.length,
      reason: `Deler ${overlap.length} kerneord: ${overlap.join(", ")}`,
    };
  }

  if (overlap.length === 1) {
    return {
      score: 72,
      reason: `Deler kerneordet ${overlap[0]}`,
    };
  }

  return null;
}

export function findCustomerMatchSuggestions(
  locationLabel: string | null | undefined,
  customers: CustomerRecord[]
): CustomerMatchSuggestion[] {
  if (!locationLabel) return [];

  return customers
    .filter((customer): customer is CustomerRecord & { name: string } => Boolean(customer.name))
    .map((customer) => {
      const scored = scoreCustomerCandidate(locationLabel, customer.name);
      if (!scored) return null;

      return {
        customerId: customer.id,
        customerName: customer.name,
        score: scored.score,
        reason: scored.reason,
      };
    })
    .filter((candidate): candidate is CustomerMatchSuggestion => candidate !== null)
    .sort((a, b) => b.score - a.score || a.customerName.localeCompare(b.customerName))
    .slice(0, 3);
}

function answerMatches(answer: JotformAnswer, candidates: string[]) {
  const haystacks = [answer.name, answer.text]
    .filter(Boolean)
    .map((value) => normalize(value));

  return candidates.some((candidate) => {
    const needle = normalize(candidate);
    return haystacks.some((haystack) => haystack.includes(needle));
  });
}

function getMatchingAnswer(
  answers: Record<string, JotformAnswer>,
  candidates: string[]
) {
  return Object.values(answers).find((answer) => answerMatches(answer, candidates));
}

function extractText(answer: unknown): string | null {
  if (typeof answer === "string") {
    const trimmed = answer.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (answer && typeof answer === "object") {
    const values = Object.values(answer as Record<string, unknown>)
      .filter((value) => typeof value === "string")
      .map((value) => String(value).trim())
      .filter(Boolean);

    return values.length > 0 ? values.join(" ") : null;
  }

  return null;
}

function extractEmail(answer: unknown): string | null {
  const value = extractText(answer);
  return value && value.includes("@") ? value : null;
}

function extractDate(answer: unknown): string | null {
  if (answer && typeof answer === "object") {
    const record = answer as Record<string, string>;
    if (record.datetime) {
      return record.datetime.split(" ")[0] ?? null;
    }
    if (record.year && record.month && record.day) {
      return `${record.year}-${record.month.padStart(2, "0")}-${record.day.padStart(2, "0")}`;
    }
  }

  const value = extractText(answer);
  if (!value) return null;

  const isoLike = /^\d{4}-\d{2}-\d{2}$/;
  return isoLike.test(value) ? value : null;
}

function extractNumber(answer: unknown): number | null {
  if (typeof answer === "number" && Number.isFinite(answer)) return answer;
  if (typeof answer === "string") {
    const normalized = answer.replace(/\./g, "").replace(",", ".").trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function parseSubmissionCreatedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const reparsed = new Date(normalized);
  return Number.isNaN(reparsed.getTime()) ? null : reparsed;
}

function tryParseLineItemsField(answer: unknown): ParsedOrderLineInput[] {
  if (!Array.isArray(answer)) return [];

  return answer
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;

      const record = row as Record<string, unknown>;

      return {
        lineNumber: index + 1,
        rawProductNumber: extractText(record.product_number ?? record.varenummer),
        rawProductName: extractText(record.product_name ?? record.varenavn),
        quantity: extractNumber(record.quantity ?? record.antal),
        unit: extractText(record.unit ?? record.enhed),
      };
    })
    .filter((row): row is ParsedOrderLineInput => row !== null);
}

function groupIndexedLineFields(
  answers: Record<string, JotformAnswer>,
  config: JotformFieldConfig
) {
  const grouped = new Map<number, Partial<ParsedOrderLineInput>>();

  for (const answer of Object.values(answers)) {
    const sourceKey = `${answer.name} ${answer.text}`;
    const match = sourceKey.match(/(?:^|[_\s-])(\d+)(?:$|[_\s-])/);
    if (!match) continue;

    const index = Number(match[1]);
    if (!Number.isFinite(index)) continue;

    const current = grouped.get(index) ?? { lineNumber: index };

    if (answerMatches(answer, config.productNumberLabels)) {
      current.rawProductNumber = extractText(answer.answer);
    } else if (answerMatches(answer, config.productNameLabels)) {
      current.rawProductName = extractText(answer.answer);
    } else if (answerMatches(answer, config.quantityLabels)) {
      current.quantity = extractNumber(answer.answer);
    } else if (answerMatches(answer, config.unitLabels)) {
      current.unit = extractText(answer.answer);
    }

    grouped.set(index, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0))
    .map((row, index) => ({
      lineNumber: row.lineNumber ?? index + 1,
      rawProductNumber: row.rawProductNumber ?? null,
      rawProductName: row.rawProductName ?? null,
      quantity: row.quantity ?? null,
      unit: row.unit ?? null,
    }))
    .filter((row) => row.rawProductNumber || row.rawProductName || row.quantity !== null);
}

export function getDefaultJotformFieldConfig(): JotformFieldConfig {
  return {
    location: ["Lokation på kunden", "location_on_customer"],
    submittedByName: ["submitted_by_name", "Navn", "bestiller"],
    submittedByEmail: ["submitted_by_email", "email"],
    deliveryAddress: ["delivery_address", "leveringsadresse"],
    requestedDeliveryDate: ["requested_delivery_date", "leveringsdato"],
    internalNote: ["note", "bemærkning", "kommentar"],
    lineItemsFieldKeys: ["line_items", "order_lines", "varer"],
    productNumberLabels: ["varenummer", "product_number"],
    productNameLabels: ["varenavn", "product_name"],
    quantityLabels: ["antal", "quantity"],
    unitLabels: ["enhed", "unit"],
  };
}

export function parseJotformSubmission(
  submission: JotformSubmission,
  config: JotformFieldConfig
): ParsedOrderInput {
  const locationAnswer = getMatchingAnswer(submission.answers, config.location);
  const submittedByNameAnswer = getMatchingAnswer(
    submission.answers,
    config.submittedByName
  );
  const submittedByEmailAnswer = getMatchingAnswer(
    submission.answers,
    config.submittedByEmail
  );
  const deliveryAddressAnswer = getMatchingAnswer(
    submission.answers,
    config.deliveryAddress
  );
  const requestedDeliveryDateAnswer = getMatchingAnswer(
    submission.answers,
    config.requestedDeliveryDate
  );
  const internalNoteAnswer = getMatchingAnswer(submission.answers, config.internalNote);

  let lines: ParsedOrderLineInput[] = [];
  const directLineItemsAnswer = Object.values(submission.answers).find((answer) =>
    answerMatches(answer, config.lineItemsFieldKeys)
  );

  if (directLineItemsAnswer) {
    lines = tryParseLineItemsField(directLineItemsAnswer.answer);
  }

  if (lines.length === 0) {
    lines = groupIndexedLineFields(submission.answers, config);
  }

  if (lines.length === 0) {
    lines = tryParseInventoryWidgetLines(submission.answers);
  }

  return {
    submissionId: submission.id,
    submittedAt: submission.created_at,
    locationLabel: extractText(locationAnswer?.answer),
    submittedByName: extractText(submittedByNameAnswer?.answer),
    submittedByEmail: extractEmail(submittedByEmailAnswer?.answer),
    deliveryAddress: extractText(deliveryAddressAnswer?.answer),
    requestedDeliveryDate: extractDate(requestedDeliveryDateAnswer?.answer),
    internalNote: extractText(internalNoteAnswer?.answer),
    lines,
    rawAnswers: submission.answers,
  };
}

function buildCustomerLookup(
  customers: CustomerRecord[],
  aliases: CustomerAliasRecord[]
) {
  const lookup = new Map<string, string>();

  for (const customer of customers) {
    if (customer.name) {
      lookup.set(normalize(customer.name), customer.id);
      lookup.set(normalizeCompact(customer.name), customer.id);
      const stripped = stripCompanyNoise(customer.name);
      if (stripped) {
        lookup.set(stripped, customer.id);
        lookup.set(stripped.replace(/\s+/g, ""), customer.id);
      }
    }
  }

  for (const alias of aliases) {
    lookup.set(normalize(alias.alias_value), alias.customer_id);
    lookup.set(normalizeCompact(alias.alias_value), alias.customer_id);
    const stripped = stripCompanyNoise(alias.alias_value);
    if (stripped) {
      lookup.set(stripped, alias.customer_id);
      lookup.set(stripped.replace(/\s+/g, ""), alias.customer_id);
    }
  }

  return lookup;
}

function buildProductLookup(products: ProductRecord[]) {
  return new Map(
    products.map((product) => [normalize(product.product_number), product] as const)
  );
}

function buildCustomerPriceLookup(rows: CustomerProductPriceRecord[]) {
  const lookup = new Map<string, number>();

  for (const row of rows) {
    lookup.set(`${row.customer_id}:${row.product_id}`, row.price);
  }

  return lookup;
}

export async function fetchJotformSubmissions(params: {
  apiKey: string;
  formId: string;
  existingIds: Set<string>;
  minCreatedAt?: string;
}) {
  const submissions: JotformSubmission[] = [];
  let offset = 0;
  let skippedExisting = 0;
  const minCreatedAt = parseSubmissionCreatedAt(params.minCreatedAt ?? DEFAULT_MIN_CREATED_AT);

  while (true) {
    const url = `${JOTFORM_BASE}/form/${params.formId}/submissions?apiKey=${params.apiKey}&limit=${DEFAULT_PAGE_SIZE}&offset=${offset}&orderby=created_at&direction=DESC`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Jotform API fejl: ${response.status}`);
    }

    const json = await response.json();
    const pageSubmissions = (json.content ?? []) as JotformSubmission[];

    if (pageSubmissions.length === 0) break;

    const filteredPageSubmissions = minCreatedAt
      ? pageSubmissions.filter((submission) => {
          const createdAt = parseSubmissionCreatedAt(submission.created_at);
          return createdAt ? createdAt >= minCreatedAt : false;
        })
      : pageSubmissions;

    skippedExisting += filteredPageSubmissions.filter((submission) =>
      params.existingIds.has(submission.id)
    ).length;

    submissions.push(...filteredPageSubmissions);

    const allKnown = filteredPageSubmissions.length > 0 && filteredPageSubmissions.every((submission) =>
      params.existingIds.has(submission.id)
    );

    const reachedOlderSubmissions = minCreatedAt
      ? pageSubmissions.some((submission) => {
          const createdAt = parseSubmissionCreatedAt(submission.created_at);
          return createdAt ? createdAt < minCreatedAt : false;
        })
      : false;

    if (allKnown || pageSubmissions.length < DEFAULT_PAGE_SIZE || reachedOlderSubmissions) {
      break;
    }

    offset += DEFAULT_PAGE_SIZE;
  }

  return {
    skippedExisting,
    newSubmissions: submissions.filter(
      (submission) =>
        submission.status === "ACTIVE" && !params.existingIds.has(submission.id)
    ),
  };
}

export async function syncJotformOrderSubmissions(params: {
  apiKey: string;
  formId: string;
  minCreatedAt?: string;
  config?: JotformFieldConfig;
  repository: JotformSyncRepository;
}): Promise<SyncResult> {
  const repository = params.repository;
  const config = params.config ?? getDefaultJotformFieldConfig();

  const existingIds = await repository.getImportedSubmissionIds();
  const [customers, aliases, products] = await Promise.all([
    repository.getCustomers(),
    repository.getCustomerAliases("jotform"),
    repository.getProducts(),
  ]);

  const customerLookup = buildCustomerLookup(customers, aliases);
  const productLookup = buildProductLookup(products);

  const { newSubmissions: submissions, skippedExisting } = await fetchJotformSubmissions({
    apiKey: params.apiKey,
    formId: params.formId,
    existingIds,
    minCreatedAt: params.minCreatedAt,
  });

  let importedRequests = 0;
  let importedLines = 0;
  let actionRequiredLines = 0;
  let failedCustomerMatches = 0;

  for (const submission of submissions) {
    const parsed = parseJotformSubmission(submission, config);
    const locationKey = normalize(parsed.locationLabel);
    const customerId =
      customerLookup.get(locationKey) ??
      customerLookup.get(normalizeCompact(parsed.locationLabel)) ??
      customerLookup.get(stripCompanyNoise(parsed.locationLabel));

    if (!parsed.locationLabel || !customerId) {
      failedCustomerMatches += 1;
      await repository.insertImportError({
        source: "jotform",
        source_submission_id: submission.id,
        error_type: "customer_match_failed",
        error_message: `Kunde kunne ikke matches for lokation: ${parsed.locationLabel ?? "tom værdi"}`,
        raw_payload: submission,
      });
      continue;
    }

    if (parsed.lines.length === 0) {
      await repository.insertImportError({
        source: "jotform",
        source_submission_id: submission.id,
        error_type: "no_lines_found",
        error_message: "Submissionen indeholdt ingen genkendelige varelinjer.",
        raw_payload: submission,
      });
      continue;
    }

    const matchedProductIds = parsed.lines
      .map((line) => productLookup.get(normalize(line.rawProductNumber))?.id ?? null)
      .filter((productId): productId is string => productId !== null);

    const customerPrices = buildCustomerPriceLookup(
      await repository.getCustomerProductPrices(customerId ? [customerId] : [], matchedProductIds)
    );

    const orderRow: OrderRequestInsert = {
      customer_id: customerId,
      source: "jotform",
      source_submission_id: parsed.submissionId,
      status: "created",
      submitted_by_name: parsed.submittedByName,
      submitted_by_email: parsed.submittedByEmail,
      location_label: parsed.locationLabel,
      delivery_address: parsed.deliveryAddress,
      requested_delivery_date: parsed.requestedDeliveryDate,
      internal_note: parsed.internalNote,
      created_at: new Date(parsed.submittedAt).toISOString(),
      imported_at: new Date().toISOString(),
    };

    const createdRequest = await repository.insertOrderRequest(orderRow);
    importedRequests += 1;

    const lineRows: OrderRequestLineInsert[] = [];

    for (const line of parsed.lines) {
      const matchedProduct = line.rawProductNumber
        ? productLookup.get(normalize(line.rawProductNumber))
        : undefined;

      const quantity = line.quantity ?? 0;
      const invalidQuantity = !line.quantity || line.quantity <= 0;
      const needsAction = invalidQuantity || !matchedProduct;

      const lineStatus = matchedProduct && !invalidQuantity
        ? "ready_for_purchase"
        : "draft_needed";

      if (needsAction) actionRequiredLines += 1;

      lineRows.push({
        request_id: createdRequest.id,
        product_id: matchedProduct?.id ?? null,
        supplier_id: matchedProduct?.supplier_id ?? null,
        line_number: line.lineNumber,
        raw_product_number: line.rawProductNumber,
        raw_product_name: line.rawProductName,
        quantity,
        unit: line.unit ?? matchedProduct?.unit ?? null,
        resolved_product_number: matchedProduct?.product_number ?? null,
        resolved_product_name: matchedProduct?.name ?? null,
        price_for_stats: matchedProduct
          ? customerPrices.get(`${customerId}:${matchedProduct.id}`) ?? matchedProduct.default_price ?? null
          : null,
        line_status: lineStatus,
        needs_action: needsAction,
        action_reason: invalidQuantity
          ? "invalid_quantity"
          : matchedProduct
            ? null
            : "unknown_product_number",
        draft_product_suggestion: matchedProduct
          ? null
          : {
              product_number: line.rawProductNumber,
              product_name: line.rawProductName,
              unit: line.unit,
              supplier_hint: null,
            },
        customer_label_snapshot: parsed.locationLabel,
      });
    }

    await repository.insertOrderRequestLines(lineRows);
    importedLines += lineRows.length;
  }

  const result: SyncResult = {
    success: true,
    importedRequests,
    importedLines,
    actionRequiredLines,
    skippedExisting,
    failedCustomerMatches,
  };

  await repository.insertSyncLog({
    source: "orders_jotform",
    status: "success",
    message: `Importerede ${importedRequests} ordrer og ${importedLines} linjer. ${actionRequiredLines} linjer kræver handling.`,
  });

  return result;
}
