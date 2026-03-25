import {
  CustomerAliasRecord,
  CustomerRecord,
  JotformFieldConfig,
  JotformSubmission,
  ProductRecord,
} from "./jotform-types";
import {
  fetchJotformSubmissions,
  findCustomerMatchSuggestions,
  getDefaultJotformFieldConfig,
  parseJotformSubmission,
} from "./jotform-sync";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildCustomerLookup(
  customers: CustomerRecord[],
  aliases: CustomerAliasRecord[]
) {
  const lookup = new Map<string, string>();

  for (const customer of customers) {
    if (customer.name) lookup.set(normalize(customer.name), customer.id);
  }

  for (const alias of aliases) {
    lookup.set(normalize(alias.alias_value), alias.customer_id);
  }

  return lookup;
}

function buildProductLookup(products: ProductRecord[]) {
  return new Map(
    products.map((product) => [normalize(product.product_number), product] as const)
  );
}

export async function previewJotformOrderSync(params: {
  apiKey: string;
  formId: string;
  existingIds: Set<string>;
  customers: CustomerRecord[];
  aliases: CustomerAliasRecord[];
  products: ProductRecord[];
  config?: JotformFieldConfig;
}) {
  const config = params.config ?? getDefaultJotformFieldConfig();
  const customerLookup = buildCustomerLookup(params.customers, params.aliases);
  const productLookup = buildProductLookup(params.products);

  const { newSubmissions, skippedExisting } = await fetchJotformSubmissions({
    apiKey: params.apiKey,
    formId: params.formId,
    existingIds: params.existingIds,
  });

  const preview = newSubmissions.slice(0, 10).map((submission: JotformSubmission) => {
    const parsed = parseJotformSubmission(submission, config);
    const customerId = customerLookup.get(normalize(parsed.locationLabel));
    const suggestions = !customerId
      ? findCustomerMatchSuggestions(parsed.locationLabel, params.customers)
      : [];

    const linePreview = parsed.lines.map((line) => {
      const matchedProduct = line.rawProductNumber
        ? productLookup.get(normalize(line.rawProductNumber))
        : undefined;

      return {
        lineNumber: line.lineNumber,
        rawProductNumber: line.rawProductNumber,
        rawProductName: line.rawProductName,
        quantity: line.quantity,
        matched: Boolean(matchedProduct),
        needsAction: !matchedProduct || !line.quantity || line.quantity <= 0,
      };
    });

    return {
      submissionId: parsed.submissionId,
      locationLabel: parsed.locationLabel,
      customerMatched: Boolean(customerId),
      customerSuggestions: suggestions,
      lineCount: parsed.lines.length,
      lines: linePreview,
    };
  });

  return {
    success: true,
    dryRun: true,
    skippedExisting,
    fetchedNewSubmissions: newSubmissions.length,
    preview,
  };
}
