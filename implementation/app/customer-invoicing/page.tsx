import { getSavedPurchaseOrdersData } from "@/lib/orders/purchase-order-queries";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Ikke registreret endnu";
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CustomerInvoicingPage() {
  const result = await getSavedPurchaseOrdersData({ status: "completed" });

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/customer-invoicing</p>
        <h1>Fakturering til kunde</h1>
        <p>
          Her lander leverandørordrer, når ordren er modtaget ved kunden og sendt videre til
          fakturering.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Klar til fakturering</strong>
            <p className="metric-inline">{result.purchaseOrders.length}</p>
          </article>
          <article className="card">
            <strong>Kilde</strong>
            <p className="metric-inline">{result.source === "live" ? "Live" : "Mock"}</p>
          </article>
        </div>
      </section>

      <section className="panel-stack">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Flow</p>
              <h2>Klar til fakturering</h2>
            </div>
            <span className={`pill ${result.source === "live" ? "success" : "warning"}`}>
              {result.source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>
          {result.message ? <p className="muted">{result.message}</p> : null}

          {result.purchaseOrders.length === 0 ? (
            <p className="muted">
              Ingen leverandørordrer er sendt videre endnu. Når en ordre sættes til sidste trin i
              menuen Leverandørordre, vises den her.
            </p>
          ) : (
            <div className="panel-stack">
              {result.purchaseOrders.map((purchaseOrder) => (
                <article className="card nested-card" key={purchaseOrder.id}>
                  <div className="card-header">
                    <div>
                      <p className="kicker">Leverandør</p>
                      <h3>{purchaseOrder.supplierName}</h3>
                      <p className="muted">
                        {purchaseOrder.customerCount} kunder · {purchaseOrder.lineCount} linjer
                      </p>
                    </div>
                    <span className={`pill ${purchaseOrder.statusTone}`}>
                      {purchaseOrder.statusLabel}
                    </span>
                  </div>

                  <p className="table-meta">Oprettet: {formatDateTime(purchaseOrder.createdAt)}</p>
                  <p className="table-meta">Afsendt: {formatDateTime(purchaseOrder.sentAt)}</p>
                  {purchaseOrder.emailSubject ? (
                    <p className="table-meta">Emne: {purchaseOrder.emailSubject}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
