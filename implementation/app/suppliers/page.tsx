import SupplierContactEditor from "@/components/SupplierContactEditor";
import { getSuppliersData } from "@/lib/suppliers/supplier-queries";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const { suppliers, source, message } = await getSuppliersData();

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/suppliers</p>
        <h1>Leverandører</h1>
        <p>
          Her vedligeholdes leverandørkartoteket med de kontaktoplysninger, som bruges i
          leverandørordre og mailfunktionen.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Leverandører</strong>
            <p className="metric-inline">{suppliers.length}</p>
          </article>
          <article className="card">
            <strong>Datakilde</strong>
            <p className="metric-inline">{source === "live" ? "Live" : "Mock"}</p>
          </article>
        </div>
      </section>

      <section className="panel-stack">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Leverandørkartotek</p>
              <h2>Kontaktoplysninger til mailflow</h2>
            </div>
            <span className={`pill ${source === "live" ? "success" : "warning"}`}>
              {source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>

          {message ? <p className="muted">{message}</p> : null}

          <div className="panel-stack">
            {suppliers.map((supplier) => (
              <article className="card nested-card" key={supplier.id}>
                <div className="card-header">
                  <div>
                    <p className="kicker">Leverandør</p>
                    <h3>{supplier.name}</h3>
                    <p className="muted">
                      {supplier.productCount} varer · {supplier.purchaseOrderCount} leverandørordrer
                    </p>
                  </div>
                  <div className="button-row">
                    <span className={`pill ${supplier.isActive ? "success" : "neutral"}`}>
                      {supplier.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                    {supplier.orderEmail ? (
                      <span className="pill info">{supplier.orderEmail}</span>
                    ) : (
                      <span className="pill danger">Mangler ordre-e-mail</span>
                    )}
                  </div>
                </div>

                <SupplierContactEditor supplier={supplier} />
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
