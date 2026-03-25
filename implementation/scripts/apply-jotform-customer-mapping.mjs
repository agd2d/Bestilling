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

function parseCsv(filePath) {
  const [headerLine, ...rows] = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);

  const headers = headerLine.split(",");

  return rows.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

const rootDir = path.resolve(process.cwd(), "..");
const envPath = path.join(process.cwd(), ".env.local");
const mappingPath = path.join(rootDir, "docs", "jotform-customer-mapping.csv");

const env = parseEnvFile(envPath);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const rows = parseCsv(mappingPath)
  .filter((row) => row.approved_customer_id && row.alias_value)
  .map((row) => ({
    source: row.source || "jotform",
    customer_id: row.approved_customer_id,
    alias_value: row.alias_value,
  }));

if (rows.length === 0) {
  console.log("Ingen godkendte aliaser at importere endnu.");
  process.exit(0);
}

const { error } = await supabase
  .from("customer_import_aliases")
  .upsert(rows, { onConflict: "source,alias_value" });

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Importerede ${rows.length} kundemapping-aliaser.`);
