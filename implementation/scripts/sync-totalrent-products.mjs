import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import XLSX from "xlsx";
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

function inferUnit(label) {
  const normalized = String(label ?? "").toLowerCase();

  if (/\b\d+\s?ltr\b|\b\d+\s?l\b|\b0[,.]75l\b|\b1l\b|\b5l\b|\b10l\b/.test(normalized)) {
    return "ltr";
  }
  if (/\b\d+\s?ml\b|\b150ml\b|\b500ml\b|\b600 ml\b|\b750 ml\b/.test(normalized)) {
    return "ml";
  }
  if (/\b\d+\s?kg\b|\b10kg\b|\b2kg\b/.test(normalized)) return "kg";
  if (/\b\d+\s?m\b|\b100 meter\b|\b18 meter\b/.test(normalized)) return "m";
  if (/\bkrt\b|\bkarton\b|\bkasse\b/.test(normalized)) return "krt";
  if (/\brulle\b|\brl\b/.test(normalized)) return "rulle";
  if (/\bpakke\b|\bpk\b/.test(normalized)) return "pakke";

  return "stk";
}

function normalizeProductNumber(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return String(value ?? "").trim();
}

function normalizePrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }

  const normalized = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function normalizeIsActive(value) {
  return String(value ?? "").trim().toUpperCase() === "JA";
}

function getWorkbookRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

const envPath = path.join(process.cwd(), ".env.local");
const env = parseEnvFile(envPath);

const suppliedPath = process.argv[2];
if (!suppliedPath) {
  console.error("Brug: npm run sync:totalrent-products -- <sti-til-xlsx>");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), suppliedPath);
if (!fs.existsSync(filePath)) {
  console.error(`Filen findes ikke: ${filePath}`);
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const supplierCandidates = ["Totalrent (Test)", "Totalrent", "Total Rent"];
let supplier = null;

for (const name of supplierCandidates) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (data) {
    supplier = data;
    break;
  }
}

if (!supplier) {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: "Totalrent",
      notes: "Autooprettet fra Totalrent varekatalog",
      is_primary: true,
    })
    .select("id, name")
    .single();

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  supplier = data;
}

const rows = getWorkbookRows(filePath);
const importRows = [];
const errors = [];

for (const [index, row] of rows.entries()) {
  const productNumber = normalizeProductNumber(row["Varenummer"]);
  const name = normalizeName(row["Tekst"]);
  const defaultPrice = normalizePrice(row["Sidst fakturerede pris"]);

  if (!productNumber || !name) {
    errors.push({
      row_number: index + 2,
      product_number: productNumber || null,
      error_message: "Varenummer eller tekst mangler.",
    });
    continue;
  }

  importRows.push({
    supplier_id: supplier.id,
    product_number: productNumber,
    name,
    default_price: defaultPrice,
    unit: inferUnit(name),
    is_active: normalizeIsActive(row["2026-Pris"]),
  });
}

const productNumbers = importRows.map((row) => row.product_number);
const { data: existingProducts, error: existingProductsError } = await supabase
  .from("products")
  .select("id, product_number")
  .in("product_number", productNumbers);

if (existingProductsError) {
  console.error(existingProductsError.message);
  process.exit(1);
}

const existingNumbers = new Set((existingProducts ?? []).map((product) => product.product_number));

const { data: batch, error: batchError } = await supabase
  .from("product_import_batches")
  .insert({
    file_name: path.basename(filePath),
    row_count: rows.length,
    created_count: 0,
    updated_count: 0,
    failed_count: errors.length,
  })
  .select("id")
  .single();

if (batchError) {
  console.error(batchError.message);
  process.exit(1);
}

if (errors.length > 0) {
  const { error: errorInsertError } = await supabase.from("product_import_errors").insert(
    errors.map((item) => ({
      batch_id: batch.id,
      row_number: item.row_number,
      product_number: item.product_number,
      error_message: item.error_message,
    }))
  );

  if (errorInsertError) {
    console.error(errorInsertError.message);
    process.exit(1);
  }
}

const { error: upsertError } = await supabase
  .from("products")
  .upsert(importRows, { onConflict: "product_number" });

if (upsertError) {
  console.error(upsertError.message);
  process.exit(1);
}

const createdCount = importRows.filter((row) => !existingNumbers.has(row.product_number)).length;
const updatedCount = importRows.length - createdCount;

const { error: updateBatchError } = await supabase
  .from("product_import_batches")
  .update({
    created_count: createdCount,
    updated_count: updatedCount,
    failed_count: errors.length,
  })
  .eq("id", batch.id);

if (updateBatchError) {
  console.error(updateBatchError.message);
  process.exit(1);
}

console.log(
  `Totalrent import færdig. Supplier: ${supplier.name}. Rækker: ${rows.length}. Oprettet: ${createdCount}. Opdateret: ${updatedCount}. Fejl: ${errors.length}.`
);
