import Link from "next/link";
import { notFound } from "next/navigation";
import OrderFlowButton from "@/components/OrderFlowButton";
import OrderLabelsPanel from "@/components/OrderLabelsPanel";
import OrderLinesEditor from "@/components/OrderLinesEditor";
import OrderNotesPanel from "@/components/OrderNotesPanel";
import UndoSupplierOrderButton from "@/components/UndoSupplierOrderButton";
import { getLabelTone } from "@/lib/orders/order-labels";
import { getOrderByIdData } from "@/lib/orders/order-queries";

export const dynamic = "force-dynamic";

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

  const lockedInSupplierOrder =
    order.rawStatus === "sent_to_supplier" &&
    order.lines.some((line) => line.rawStatus === "included_in_purchase_order");

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

        <p>
          {order.rawStatus === "sent_to_supplier" ? (
            <Link href="/purchase-orders">Vis i leverandørordre</Link>
          ) : (
            <Link href="/orders">Tilbage til varebestilling</Link>
          )}
        </p>
      </section>

      <section className="panel-stack">
        <OrderLinesEditor
          requestId={order.id}
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

        <div className="card">
          <p className="kicker">Flow</p>
          <div className="flow-action-stack">
            {lockedInSupplierOrder ? (
              <>
                <div>
                  <h2>Ordren er låst i leverandørordre</h2>
                  <p className="muted">
                    Denne ordre kan ikke sendes direkte tilbage, fordi en eller flere linjer allerede
                    indgår i en leverandørordre.
                  </p>
                </div>
                <UndoSupplierOrderButton orderId={order.id} />
              </>
            ) : (
              <>
                <div>
                  <h2>Klar til næste trin</h2>
                  <p className="muted">
                    Når ordrelinjerne er på plads, kan kundebestillingen sendes videre til
                    leverandørordre.
                  </p>
                </div>
                <OrderFlowButton orderId={order.id} currentStatus={order.rawStatus} />
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
