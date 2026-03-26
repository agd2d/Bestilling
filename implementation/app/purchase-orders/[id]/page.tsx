import Link from "next/link";
import PurchaseOrderLifecycleButtons from "@/components/PurchaseOrderLifecycleButtons";
import PurchaseOrderStatusSelect from "@/components/PurchaseOrderStatusSelect";
import SupplierMailButton from "@/components/SupplierMailButton";
import { getPurchaseOrderDetailData } from "@/lib/orders/purchase-order-queries";

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

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPurchaseOrderDetailData(id);

  if (!result.purchaseOrder) {
    return null;
  }

  const purchaseOrder = result.purchaseOrder;

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/purchase-orders/{purchaseOrder.id}</p>
        <h1>{purchaseOrder.supplierName}</h1>
        <p>
          Detaljeside for leverandørordre med ordrenummer, status, mailgrundlag og alle samlede linjer.
          Tilbage til <Link href="/purchase-orders">Leverandørordre</Link>.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Status</strong>
            <p className="metric-inline">{purchaseOrder.statusLabel}</p>
          </article>
          <article className="card">
            <strong>Kunder</strong>
            <p className="metric-inline">{purchaseOrder.customerCount}</p>
          </article>
          <article className="card">
            <strong>Linjer</strong>
            <p className="metric-inline">{purchaseOrder.lineCount}</p>
          </article>
          <article className="card">
            <strong>Ordrenummer</strong>
            <p className="metric-inline">{purchaseOrder.orderNumber}</p>
          </article>
        </div>
      </section>

      <section className="panel-stack">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Overblik</p>
              <h2>Leverandørordre</h2>
            </div>
            <span className={`pill ${purchaseOrder.statusTone}`}>{purchaseOrder.statusLabel}</span>
          </div>

          {result.message ? <p className="muted">{result.message}</p> : null}

          <div className="two-grid">
            <div>
              <p className="table-meta">Ordrenummer: {purchaseOrder.orderNumber}</p>
              <p className="table-meta">Leverandør: {purchaseOrder.supplierName}</p>
              <p className="table-meta">E-mail: {purchaseOrder.supplierEmail ?? "Ikke registreret"}</p>
              <p className="table-meta">Oprettet: {formatDateTime(purchaseOrder.createdAt)}</p>
              <p className="table-meta">Afgivet: {formatDateTime(purchaseOrder.sentAt)}</p>
              {purchaseOrder.emailSubject ? (
                <p className="table-meta">Emne: {purchaseOrder.emailSubject}</p>
              ) : null}
              {purchaseOrder.emailBody && purchaseOrder.emailSubject ? (
                <div className="purchase-actions-bar">
                  <SupplierMailButton
                    to={purchaseOrder.supplierEmail}
                    subject={purchaseOrder.emailSubject}
                    body={purchaseOrder.emailBody}
                  />
                </div>
              ) : null}
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
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Ordrelinjer</p>
              <h2>Samlede linjer</h2>
            </div>
            <span className="pill neutral">{result.lines.length} linjer</span>
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
              {result.lines.map((line) => (
                <tr key={line.id}>
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
        </article>

        {purchaseOrder.emailBody ? (
          <article className="card">
            <div className="card-header">
              <div>
                <p className="kicker">Mail</p>
                <h2>Mailgrundlag</h2>
              </div>
            </div>
            <div className="two-grid">
              <div className="card nested-card">
                <p className="kicker">Mail-emne</p>
                <p className="mail-draft-box">{purchaseOrder.emailSubject ?? "Intet emne"}</p>
              </div>
              <div className="card nested-card">
                <p className="kicker">Mail-krop</p>
                <pre className="mail-draft-box multiline">{purchaseOrder.emailBody}</pre>
              </div>
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}
