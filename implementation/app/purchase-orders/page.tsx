import Link from "next/link";
import CreatePurchaseOrderButton from "@/components/CreatePurchaseOrderButton";
import PurchaseOrderLifecycleButtons from "@/components/PurchaseOrderLifecycleButtons";
import PurchaseOrderStatusSelect from "@/components/PurchaseOrderStatusSelect";
import SupplierMailButton from "@/components/SupplierMailButton";
import { getOrdersListData } from "@/lib/orders/order-queries";
import {
  getPurchaseDraftsData,
  getSavedPurchaseOrdersData,
} from "@/lib/orders/purchase-order-queries";

export const dynamic = "force-dynamic";

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
    (purchaseOrder) => purchaseOrder.status === "partially_delivered"
  ).length;
  const activePurchaseOrders = savedResult.purchaseOrders.filter(
    (purchaseOrder) => !["partially_delivered", "cancelled"].includes(purchaseOrder.status)
  );

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/purchase-orders</p>
        <h1>Leverandørordre</h1>
        <p>
          Her håndteres flowet fra ordre afgivet til modtaget ved kunde. Når ordren er modtaget ved
          kunden, flyttes den videre til <Link href="/customer-invoicing">Fakturering til kunde</Link>.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Åbne kladder</strong>
            <p className="metric-inline">{draftResult.groups.length}</p>
          </article>
          <article className="card">
            <strong>Linjer i nye kladder</strong>
            <p className="metric-inline">{totalDraftLines}</p>
          </article>
          <article className="card">
            <strong>Lukkede leverandørordrer</strong>
            <p className="metric-inline">{activePurchaseOrders.length}</p>
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
              <h3>Ordre afgivet</h3>
              <p className="muted">Ordren får ordrenummer og låses for nye varer.</p>
            </div>
            <div className="flow-stage-card">
              <p className="kicker">2</p>
              <h3>Bekræftet af leverandør</h3>
              <p className="muted">Leverandøren har bekræftet ordren.</p>
            </div>
            <div className="flow-stage-card">
              <p className="kicker">3</p>
              <h3>Modtaget ved kunde</h3>
              <p className="muted">Ordren flyttes herefter videre til fakturering.</p>
            </div>
            <div className="flow-stage-card">
              <p className="kicker">4</p>
              <h3>Ny kladde ved nye varer</h3>
              <p className="muted">Nye varer går i en ny kladde og ikke ind i den lukkede ordre.</p>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Aktive leverandørordrer</p>
              <h2>Lukkede ordrer med ordrenummer</h2>
            </div>
            <span className="pill neutral">{activePurchaseOrders.length} ordrer</span>
          </div>

          {activePurchaseOrders.length === 0 ? (
            <p className="muted">Ingen leverandørordrer er oprettet endnu.</p>
          ) : (
            <div className="panel-stack">
              {activePurchaseOrders.map((purchaseOrder) => (
                <article className="card nested-card" key={purchaseOrder.id}>
                  <div className="card-header">
                    <div>
                      <p className="kicker">Ordrenummer {purchaseOrder.orderNumber}</p>
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
                      <span className="pill neutral">
                        {purchaseOrder.status === "draft" ? "Åben ordre" : "Lukket ordre"}
                      </span>
                      {purchaseOrder.supplierEmail ? (
                        <span className="pill neutral">{purchaseOrder.supplierEmail}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="two-grid">
                    <div>
                      <p className="table-meta">Oprettet: {formatDateTime(purchaseOrder.createdAt)}</p>
                      <p className="table-meta">Afgivet: {formatDateTime(purchaseOrder.sentAt)}</p>
                      {purchaseOrder.emailSubject ? (
                        <p className="table-meta">Emne: {purchaseOrder.emailSubject}</p>
                      ) : null}
                      <p className="table-meta">
                        <Link className="table-link" href={`/purchase-orders/${purchaseOrder.id}`}>
                          Åbn leverandørordre
                        </Link>
                      </p>
                    </div>
                    <div className="panel-stack">
                      <PurchaseOrderStatusSelect
                        purchaseOrderId={purchaseOrder.id}
                        currentStatus={purchaseOrder.status}
                      />
                      <PurchaseOrderLifecycleButtons
                        purchaseOrderId={purchaseOrder.id}
                        currentStatus={purchaseOrder.status}
                      />
                      {purchaseOrder.emailSubject ? (
                        <SupplierMailButton
                          to={purchaseOrder.supplierEmail}
                          subject={purchaseOrder.emailSubject}
                          body={`Ordrenummer: ${purchaseOrder.orderNumber}`}
                          purchaseOrderId={purchaseOrder.id}
                        />
                      ) : null}
                    </div>
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
            <p className="muted">Ingen kundebestillinger venter på at blive lukket som leverandørordre.</p>
          ) : (
            <div className="insight-list">
              {stagedOrdersResult.orders.map((order) => (
                <Link href={`/orders/${order.id}`} key={order.id} className="insight-row">
                  <div>
                    <strong>{order.customerName}</strong>
                    <p>{order.locationLabel}</p>
                  </div>
                  <span className="pill warning">Klar til ny kladde</span>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Nye kladder</p>
              <h2>Klar til næste lukkede ordre</h2>
            </div>
            <span className={`pill ${draftResult.source === "live" ? "success" : "warning"}`}>
              {draftResult.source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>
          {draftResult.message ? <p className="muted">{draftResult.message}</p> : null}

          {draftResult.groups.length === 0 ? (
            <p className="muted">Ingen nye linjer er klar til at blive samlet i en ny kladde lige nu.</p>
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
                    <span className="pill success">Klar til ny lukket ordre</span>
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
                  <div className="button-row">
                    <CreatePurchaseOrderButton
                      supplierId={group.supplierId}
                      lineIds={group.lines.map((line) => line.requestLineId)}
                      emailSubject={group.emailSubject}
                      emailBody={group.emailBody}
                    />
                    <SupplierMailButton
                      to={group.supplierEmail}
                      subject={group.emailSubject}
                      body={group.emailBody}
                    />
                  </div>
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
