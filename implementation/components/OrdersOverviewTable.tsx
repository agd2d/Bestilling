import Link from "next/link";
import OrderStatusSelect from "@/components/OrderStatusSelect";
import { MockOrder } from "@/lib/orders/mock-orders";

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

function labelClass(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("haste")) return "pill danger";
  if (normalized.includes("restordre")) return "pill warning";
  if (normalized.includes("klar")) return "pill success";
  return "pill neutral";
}

export default function OrdersOverviewTable({
  orders,
  source,
  message,
}: {
  orders: MockOrder[];
  source: "live" | "mock";
  message?: string;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="kicker">Ordreoversigt</p>
          <h2>Kundebestillinger</h2>
        </div>
        <div className="button-row">
          <span className={`pill ${source === "live" ? "success" : "warning"}`}>
            {source === "live" ? "Live data" : "Mock fallback"}
          </span>
          <span className="pill neutral">{orders.length} ordrer</span>
        </div>
      </div>

      {message && <p className="muted">{message}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Lokation</th>
            <th>Kunde</th>
            <th>Oprettet af</th>
            <th>Linjer</th>
            <th>Status</th>
            <th>Labels</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link href={`/orders/${order.id}`} className="table-link">
                  {order.locationLabel}
                </Link>
                <div className="table-meta">{order.createdAt}</div>
              </td>
              <td>{order.customerName}</td>
              <td>{order.submittedBy}</td>
              <td>
                {order.lineCount}
                {order.actionRequiredCount > 0 && (
                  <div className="table-meta danger-text">
                    {order.actionRequiredCount} kræver handling
                  </div>
                )}
              </td>
              <td>
                <span className={pillClass(order.status)}>{order.status}</span>
                <div className="table-meta">
                  <OrderStatusSelect orderId={order.id} currentStatus={order.rawStatus} />
                </div>
              </td>
              <td>
                {order.labels.length > 0 ? (
                  <div className="button-row">
                    {order.labels.map((label) => (
                      <span className={labelClass(label)} key={`${order.id}-${label}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="table-meta">Ingen labels</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
