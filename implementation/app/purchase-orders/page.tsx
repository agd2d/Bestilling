import Link from "next/link";
import CreatePurchaseOrderButton from "@/components/CreatePurchaseOrderButton";
import { getPurchaseDraftsData } from "@/lib/orders/purchase-order-queries";

export default async function PurchaseOrdersPage() {
  const { groups, source, message } = await getPurchaseDraftsData();
  const totalLines = groups.reduce((sum, group) => sum + group.lineCount, 0);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/purchase-orders</p>
        <h1>Leverandørordre</h1>
        <p>
          Her håndteres flowet fra afsendt ordre til modtaget ordre ved kunden. Når ordren er
          modtaget ved kunden, skal den videre til menuen{" "}
          <Link href="/customer-invoicing">Fakturering til kunde</Link>.
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
            <strong>Næste menu</strong>
            <p className="metric-inline">Fakturering</p>
          </article>
        </div>
      </section>

      <section className="panel-stack">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Flow</p>
              <h2>Leverandørordre-flow</h2>
            </div>
            <span className={`pill ${source === "live" ? "success" : "warning"}`}>
              {source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>
          {message && <p className="muted">{message}</p>}

          <div className="flow-stage-grid">
            <div className="flow-stage-card">
              <p className="kicker">1</p>
              <h3>Afsendt ordre</h3>
              <p className="muted">Ordren er sendt til leverandøren.</p>
            </div>
            <div className="flow-stage-card">
              <p className="kicker">2</p>
              <h3>Afventer bekræftelse fra leverandør</h3>
              <p className="muted">Vi afventer ordrebekræftelse eller tilbagemelding.</p>
            </div>
            <div className="flow-stage-card">
              <p className="kicker">3</p>
              <h3>Ordre modtaget ved kunden</h3>
              <p className="muted">Ordren er leveret og klar til næste interne trin.</p>
            </div>
            <div className="flow-stage-card">
              <p className="kicker">4</p>
              <h3>Sendes til fakturering</h3>
              <p className="muted">
                Næste menu er <Link href="/customer-invoicing">Fakturering til kunde</Link>.
              </p>
            </div>
          </div>
        </article>

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
                <span className="pill success">Klar til afsendt ordre</span>
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

            <div className="purchase-actions-bar">
              <CreatePurchaseOrderButton
                supplierId={group.supplierId}
                lineIds={group.lines.map((line) => line.requestLineId)}
                emailSubject={group.emailSubject}
                emailBody={group.emailBody}
              />
            </div>

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
