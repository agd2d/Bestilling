import Link from "next/link";
import CreatePurchaseOrderButton from "@/components/CreatePurchaseOrderButton";
import PurchaseOrderStatusSelect from "@/components/PurchaseOrderStatusSelect";
import { getOrdersListData } from "@/lib/orders/order-queries";
import {
  getPurchaseDraftsData,
  getSavedPurchaseOrdersData,
} from "@/lib/orders/purchase-order-queries";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Ikke registreret endnu";
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PurchaseOrdersPage() {
  const [draftResult, savedResult, stagedOrdersResult] = await Promise.all([
    getPurchaseDraftsData(),
    getSavedPurchaseOrdersData(),
    getOrdersListData({ onlySentToOrder: true }),
  ]);

  const totalDraftLines = draftResult.groups.reduce((sum, group) => sum + group.lineCount, 0);
  const readyForInvoicingCount = savedResult.purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === "completed"
  ).length;

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
            <strong>Åbne kladder</strong>
            <p className="metric-inline">{draftResult.groups.length}</p>
          </article>
          <article className="card">
            <strong>Linjer samlet</strong>
            <p className="metric-inline">{totalDraftLines}</p>
          </article>
          <article className="card">
            <strong>Gemte leverandørordrer</strong>
            <p className="metric-inline">{savedResult.purchaseOrders.length}</p>
          </article>
          <article className="card">
            <strong>Klar til fakturering</strong>
            <p className="metric-inline">{readyForInvoicingCount}</p>
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
            <span className={`pill ${savedResult.source === "live" ? "success" : "warning"}`}>
              {savedResult.source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>
          {savedResult.message ? <p className="muted">{savedResult.message}</p> : null}

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

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Aktive leverandørordrer</p>
              <h2>Status kan ændres direkte</h2>
            </div>
            <span className="pill neutral">{savedResult.purchaseOrders.length} ordrer</span>
          </div>

          {savedResult.purchaseOrders.length === 0 ? (
            <p className="muted">Ingen leverandørordrer er gemt endnu.</p>
          ) : (
            <div className="panel-stack">
              {savedResult.purchaseOrders.map((purchaseOrder) => (
                <article className="card nested-card" key={purchaseOrder.id}>
                  <div className="card-header">
                    <div>
                      <p className="kicker">Leverandør</p>
                      <h3>
                        <Link className="table-link" href={`/purchase-orders/${purchaseOrder.id}`}>
                          {purchaseOrder.supplierName}
                        </Link>
                      </h3>
                      <p className="muted">
                        {purchaseOrder.customerCount} kunder · {purchaseOrder.lineCount} linjer
                      </p>
                    </div>
                    <div className="button-row">
                      <span className={`pill ${purchaseOrder.statusTone}`}>
                        {purchaseOrder.statusLabel}
                      </span>
                      {purchaseOrder.supplierEmail ? (
                        <span className="pill neutral">{purchaseOrder.supplierEmail}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="two-grid">
                    <div>
                      <p className="table-meta">Oprettet: {formatDateTime(purchaseOrder.createdAt)}</p>
                      <p className="table-meta">Afsendt: {formatDateTime(purchaseOrder.sentAt)}</p>
                      {purchaseOrder.emailSubject ? (
                        <p className="table-meta">Emne: {purchaseOrder.emailSubject}</p>
                      ) : null}
                      <p className="table-meta">
                        <Link className="table-link" href={`/purchase-orders/${purchaseOrder.id}`}>
                          Åbn leverandørordre
                        </Link>
                      </p>
                    </div>
                    <PurchaseOrderStatusSelect
                      purchaseOrderId={purchaseOrder.id}
                      currentStatus={purchaseOrder.status}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Sendt fra varebestilling</p>
              <h2>Kundebestillinger i ordre-kø</h2>
            </div>
            <span className="pill neutral">{stagedOrdersResult.orders.length} bestillinger</span>
          </div>

          {stagedOrdersResult.orders.length === 0 ? (
            <p className="muted">Ingen kundebestillinger er sendt til ordre endnu.</p>
          ) : (
            <div className="insight-list">
              {stagedOrdersResult.orders.map((order) => (
                <Link href={`/orders/${order.id}`} key={order.id} className="insight-row">
                  <div>
                    <strong>{order.customerName}</strong>
                    <p>{order.locationLabel}</p>
                  </div>
                  <span className="pill warning">Tilbage mulig</span>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Nye kladder</p>
              <h2>Klar til oprettelse</h2>
            </div>
            <span className={`pill ${draftResult.source === "live" ? "success" : "warning"}`}>
              {draftResult.source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>
          {draftResult.message ? <p className="muted">{draftResult.message}</p> : null}

          {draftResult.groups.length === 0 ? (
            <p className="muted">Ingen nye linjer er klar til at blive samlet lige nu.</p>
          ) : (
            draftResult.groups.map((group) => (
              <article className="card nested-card" key={group.supplierId}>
                <div className="card-header">
                  <div>
                    <p className="kicker">Leverandør</p>
                    <h3>{group.supplierName}</h3>
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
            ))
          )}
        </article>
      </section>
    </main>
  );
}
