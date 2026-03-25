import Link from "next/link";
import { notFound } from "next/navigation";
import OrderLabelsPanel from "@/components/OrderLabelsPanel";
import OrderLinesEditor from "@/components/OrderLinesEditor";
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
  const { order, source, message, notes, availableLabels, availableProducts, availableSuppliers } =
    await getOrderByIdData(id);

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
        <OrderLinesEditor
          lines={order.lines}
          products={availableProducts}
          suppliers={availableSuppliers}
        />

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
