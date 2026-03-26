import { getPurchaseDraftsData } from "@/lib/orders/purchase-order-queries";

export default async function PurchaseOrdersPage() {
  const { groups, source, message } = await getPurchaseDraftsData();
  const totalLines = groups.reduce((sum, group) => sum + group.lineCount, 0);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/purchase-orders</p>
        <h1>Leverandørkladder</h1>
        <p>
          Her samles alle linjer, der er klar til bestilling, i interne leverandørkladder.
          Mailteksten kan kopieres direkte til Outlook, når varebestilleren er tilfreds.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Leverandører klar</strong>
            <p className="metric-inline">{groups.length}</p>
          </article>
          <article className="card">
            <strong>Linjer samlet</strong>
            <p className="metric-inline">{totalLines}</p>
          </article>
          <article className="card">
            <strong>Datakilde</strong>
            <p className="metric-inline">{source === "live" ? "Live" : "Mock"}</p>
          </article>
          <article className="card">
            <strong>Status</strong>
            <p className="metric-inline">Kladde</p>
          </article>
        </div>
      </section>

      <section className="panel-stack">
        <div className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Ugens bestilling</p>
              <h2>Samlet overblik</h2>
            </div>
            <span className={`pill ${source === "live" ? "success" : "warning"}`}>
              {source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>
          {message && <p className="muted">{message}</p>}
        </div>

        {groups.map((group) => (
          <article className="card" key={group.supplierId}>
            <div className="card-header">
              <div>
                <p className="kicker">Leverandør</p>
                <h2>{group.supplierName}</h2>
                <p className="muted">
                  {group.customerCount} kunder · {group.lineCount} linjer
                </p>
              </div>
              <div className="button-row">
                <span className="pill success">Klar til mailkladde</span>
                {group.supplierEmail ? (
                  <span className="pill neutral">{group.supplierEmail}</span>
                ) : null}
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th>Lokation</th>
                  <th>Varenr.</th>
                  <th>Varenavn</th>
                  <th>Antal</th>
                </tr>
              </thead>
              <tbody>
                {group.lines.map((line) => (
                  <tr key={line.requestLineId}>
                    <td>{line.customerName}</td>
                    <td>{line.locationLabel}</td>
                    <td>{line.productNumber}</td>
                    <td>{line.productName}</td>
                    <td>
                      {line.quantity} {line.unit ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="two-grid">
              <div className="card nested-card">
                <p className="kicker">Mail-emne</p>
                <p className="mail-draft-box">{group.emailSubject}</p>
              </div>
              <div className="card nested-card">
                <p className="kicker">Mail-krop</p>
                <pre className="mail-draft-box multiline">{group.emailBody}</pre>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
