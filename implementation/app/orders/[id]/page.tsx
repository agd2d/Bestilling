import Link from "next/link";
import { notFound } from "next/navigation";
import OrderLabelsPanel from "@/components/OrderLabelsPanel";
import OrderNotesPanel from "@/components/OrderNotesPanel";
import OrderStatusSelect from "@/components/OrderStatusSelect";
import { getLabelTone } from "@/lib/orders/order-labels";
import { getOrderByIdData } from "@/lib/orders/order-queries";

function pillClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("handling") || normalized.includes("kladde")) {
    return "pill danger";
  }
  if (normalized.includes("klar")) {
    return "pill success";
  }
  if (normalized.includes("afsendt")) {
    return "pill warning";
  }
  return "pill neutral";
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { order, source, message, notes, availableLabels } = await getOrderByIdData(id);

  if (!order) notFound();

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/orders/{order.id}</p>
        <p className="kicker">Kundebestilling</p>
        <h1>{order.locationLabel}</h1>
        <p>
          Kunde: {order.customerName} · Oprettet af {order.submittedBy} · {order.createdAt}
        </p>
        <div className="button-row">
          <span className={`pill ${source === "live" ? "success" : "warning"}`}>
            {source === "live" ? "Live data" : "Mock fallback"}
          </span>
          <span className={pillClass(order.status)}>{order.status}</span>
          {order.labels.map((label) => (
            <span className={`pill ${getLabelTone(label)}`} key={label}>
              {label}
            </span>
          ))}
        </div>
        {message && <p>{message}</p>}
        <OrderStatusSelect orderId={order.id} currentStatus={order.rawStatus} />
        <p>
          <Link href="/orders">Tilbage til ordreoversigt</Link>
        </p>
      </section>

      <section className="panel-stack">
        <div className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Linjer</p>
              <h2>Ordrelinjer</h2>
            </div>
            <span className="pill neutral">{order.lines.length} linjer</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Varenr.</th>
                <th>Navn</th>
                <th>Antal</th>
                <th>Leverandør</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.productNumber}</td>
                  <td>
                    {line.productName}
                    {line.needsAction && (
                      <div className="table-meta danger-text">Foreslå ny varekladde</div>
                    )}
                  </td>
                  <td>{line.quantity}</td>
                  <td>{line.supplier}</td>
                  <td>
                    <span className={pillClass(line.status)}>{line.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="two-grid">
          <OrderLabelsPanel
            requestId={order.id}
            availableLabels={availableLabels}
            selectedLabelNames={order.labels}
            source={source}
          />
          <OrderNotesPanel requestId={order.id} notes={notes} source={source} />
        </div>
      </section>
    </main>
  );
}
