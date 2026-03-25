import { getEnvStatus, isDevAuthBypassed } from "@/lib/env";
import JotformDryRunPanel from "@/components/JotformDryRunPanel";

const envRows = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JOTFORM_API_KEY",
  "ORDERS_JOTFORM_FORM_ID",
];

export default function HomePage() {
  const envStatus = getEnvStatus();
  const readyCount = envStatus.filter((row) => row.present).length;

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/api/sync/orders/jotform</p>
        <h1>Varebestilling integrationstest</h1>
        <p>
          Dette er det isolerede miljø til trin 6. Formålet er at gøre Jotform
          sync-ruten kørbar med rigtig Next.js-struktur og Supabase wiring, før
          noget flyttes ind i Kundedashboard.
        </p>
        <p>
          Modulvisning: <a href="/orders">åbn ordreoversigten</a>
        </p>

        <div className="grid">
          <article className="card">
            <strong>Status</strong>
            <p>
              App-skelettet matcher nu samme stack som Kundedashboard og er
              klar til miljøvariabler og dependency-installation.
            </p>
            <p>
              Miljøstatus: <span className="code">{readyCount}/5</span>
            </p>
          </article>

          <article className="card">
            <strong>Næste live test</strong>
            <p>
              Når dependencies er installeret og <span className="code">.env.local</span>{" "}
              er udfyldt, kan sync-ruten kaldes direkte.
            </p>
            <p>
              Dry run: <span className="code">POST /api/sync/orders/jotform?dryRun=true</span>
            </p>
          </article>
        </div>

        <div className="grid">
          <article className="card">
            <strong>Krævede miljøvariabler</strong>
            <ul className="list">
              {envStatus.map((row) => (
                <li key={row.key}>
                  <span className="code">{row.key}</span>{" "}
                  {row.present ? "klar" : "mangler"}
                </li>
              ))}
            </ul>
          </article>

          <article className="card">
            <strong>Forventet flow</strong>
            <ul className="list">
              <li>
                Authtjek via Supabase cookie
                {isDevAuthBypassed() ? " eller dev bypass" : ""}
              </li>
              <li>Fetch fra Jotform</li>
              <li>Kundematch via customers og aliases</li>
              <li>Produktmatch via varenummer</li>
              <li>Insert af ordre, linjer og fejl</li>
            </ul>
          </article>
        </div>

        <div className="grid">
          <article className="card">
            <strong>Test-endpoints</strong>
            <ul className="list">
              <li>
                <span className="code">GET /api/health/env</span>
              </li>
              <li>
                <span className="code">POST /api/sync/orders/jotform?dryRun=true</span>
              </li>
              <li>
                <span className="code">POST /api/sync/orders/jotform</span>
              </li>
            </ul>
          </article>

          <article className="card">
            <strong>Dev-indstilling</strong>
            <p>
              <span className="code">DEV_BYPASS_AUTH=true</span> kan bruges i det
              isolerede miljø, hvis du vil teste sync-ruten før et rigtigt loginflow
              er sat op.
            </p>
          </article>
        </div>

        <JotformDryRunPanel />
      </section>
    </main>
  );
}
