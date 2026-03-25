import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseEnvFile(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function extractProductNumber(label) {
  const patterns = [
    /varenr\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-./]*)/i,
    /vare nr\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-./]*)/i,
  ];

  for (const pattern of patterns) {
    const match = label.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function stripProductNumber(label) {
  return label
    .replace(/\s*[-–]?\s*varenr\.?.*$/i, "")
    .replace(/\s*[-–]?\s*vare nr\.?.*$/i, "")
    .trim();
}

function inferUnit(label) {
  const normalized = label.toLowerCase();

  if (/\b\d+\s?ltr\b|\b\d+\s?l\b|\b1l\b|\b5l\b|\b10l\b/.test(normalized)) return "ltr";
  if (/\b\d+\s?ml\b|\b500ml\b|\b600 ml\b|\b750 ml\b/.test(normalized)) return "ml";
  if (/\b\d+\s?kg\b|\b10kg\b|\b2kg\b/.test(normalized)) return "kg";
  if (/\b\d+\s?m\b|\b100 meter\b|\b18 meter\b/.test(normalized)) return "m";
  if (/\bstk\b|\bark\b|\bruller\b|\brl\b|\bposer\b/.test(normalized)) return "stk";

  return "stk";
}

const envPath = path.join(process.cwd(), ".env.local");
const rootDir = path.resolve(process.cwd(), "..");
const exportPath = path.join(rootDir, "docs", "jotform-products-seed.csv");
const env = parseEnvFile(envPath);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const questionsUrl = `https://eu-api.jotform.com/form/${env.ORDERS_JOTFORM_FORM_ID}/questions?apiKey=${env.JOTFORM_API_KEY}`;
const questionsResponse = await fetch(questionsUrl);
const questionsJson = await questionsResponse.json();
const questions = Object.values(questionsJson.content ?? {});

const items = questions
  .filter((question) => question.type === "control_widget" && question.text)
  .map((question) => {
    const text = String(question.text).trim();
    const productNumber = extractProductNumber(text);
    if (!productNumber) return null;

    return {
      product_number: productNumber,
      name: stripProductNumber(text),
      unit: inferUnit(text),
      source_field_name: question.name ?? "",
      source_qid: question.qid ?? "",
      source_label: text,
    };
  })
  .filter((item) => item !== null)
  .filter((item, index, array) => array.findIndex((candidate) => candidate.product_number === item.product_number) === index)
  .sort((a, b) => a.product_number.localeCompare(b.product_number));

const supplierName = "Jotform katalog";

const { data: existingSupplier, error: existingSupplierError } = await supabase
  .from("suppliers")
  .select("id, name")
  .ilike("name", supplierName)
  .maybeSingle();

if (existingSupplierError) {
  console.error(existingSupplierError.message);
  process.exit(1);
}

let supplier = existingSupplier;

if (!supplier) {
  const { data: createdSupplier, error: createSupplierError } = await supabase
    .from("suppliers")
    .insert({
      name: supplierName,
      notes: "Autooprettet fra Jotform produktkatalog",
      is_primary: true,
    })
    .select("id, name")
    .single();

  if (createSupplierError) {
    console.error(createSupplierError.message);
    process.exit(1);
  }

  supplier = createdSupplier;
}

const rows = items.map((item) => ({
  supplier_id: supplier.id,
  product_number: item.product_number,
  name: item.name,
  unit: item.unit,
  default_price: null,
  is_active: true,
}));

const { error: productError } = await supabase
  .from("products")
  .upsert(rows, { onConflict: "product_number" });

if (productError) {
  console.error(productError.message);
  process.exit(1);
}

const csvLines = [
  "product_number,name,unit,source_field_name,source_qid,source_label",
  ...items.map((item) =>
    [
      item.product_number,
      `"${item.name.replace(/"/g, '""')}"`,
      item.unit,
      item.source_field_name,
      item.source_qid,
      `"${item.source_label.replace(/"/g, '""')}"`,
    ].join(",")
  ),
];

fs.writeFileSync(exportPath, csvLines.join("\n"));

console.log(`Synkroniserede ${rows.length} produkter fra Jotform og skrev ${path.basename(exportPath)}.`);
