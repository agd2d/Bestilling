import Link from "next/link";
import OrdersOverviewTable from "@/components/OrdersOverviewTable";
import { getOrdersListData } from "@/lib/orders/order-queries";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { orders, source, message } = await getOrdersListData();
  const totalLines = orders.reduce((sum, order) => sum + order.lineCount, 0);
  const actionOrders = orders.filter((order) => order.actionRequiredCount > 0);
  const readyOrders = orders
    .filter((order) => order.actionRequiredCount === 0)
    .map((order) => ({
      ...order,
      readyLineCount: order.lines.filter((line) => line.status.toLowerCase().includes("klar")).length,
    }))
    .filter((order) => order.readyLineCount > 0)
    .sort((a, b) => b.readyLineCount - a.readyLineCount || b.lineCount - a.lineCount)
    .slice(0, 5);
  const actionLines = orders.reduce((sum, order) => sum + order.actionRequiredCount, 0);
  const readyLines = orders.flatMap((order) =>
    order.lines.filter((line) => line.status.toLowerCase().includes("klar"))
  ).length;
  const supplierSummary = Array.from(
    orders
      .flatMap((order) => order.lines)
      .reduce((map, line) => {
        const supplier = line.supplier || "Ukendt";
        const current = map.get(supplier) ?? { supplier, lineCount: 0, actionCount: 0 };
        current.lineCount += 1;
        if (line.needsAction) {
          current.actionCount += 1;
        }
        map.set(supplier, current);
        return map;
      }, new Map<string, { supplier: string; lineCount: number; actionCount: number }>())
      .values()
  )
    .filter((item) => item.supplier !== "Ukendt")
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 4);
  const newestOrder = orders[0];

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/orders</p>
        <h1>Varebestilling</h1>
        <p>
          Her arbejder varebestilleren direkte med de importerede Jotform-bestillinger. Kun
          bestillinger, som stadig er i varebestilling, vises her. N&aring;r en bestilling
          godkendes med knappen "Send til ordre", flyttes den ud af denne liste og videre til{" "}
          <Link href="/purchase-orders">Leverand&oslash;rordre</Link>.
        </p>

        <div className="grid">
          <article className="card">
            <strong>&Aring;bne bestillinger</strong>
            <p className="metric-inline">{orders.length}</p>
            <p className="metric-subtext">{totalLines} linjer i alt</p>
          </article>
          <article className="card">
            <strong>Linjer klar til bestilling</strong>
            <p className="metric-inline">{readyLines}</p>
            <p className="metric-subtext">{supplierSummary.length} aktive leverand&oslash;rer</p>
          </article>
          <article className="card">
            <strong>Kr&aelig;ver handling</strong>
            <p className="metric-inline">{actionOrders.length}</p>
            <p className="metric-subtext">{actionLines} linjer skal afklares</p>
          </article>
          <article className="card">
            <strong>Seneste import</strong>
            <p className="metric-inline">{newestOrder ? newestOrder.createdAt : "-"}</p>
            <p>
              Dry run og milj&oslash;status findes stadig p&aring; <Link href="/">forsiden</Link>.
            </p>
          </article>
        </div>
      </section>

      <section className="panel-stack orders-dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Fokus nu</p>
              <h2>Handling f&oslash;rst</h2>
            </div>
            <span className={`pill ${actionLines > 0 ? "danger" : "success"}`}>
              {actionLines > 0 ? `${actionLines} linjer \u00e5bne` : "Ingen \u00e5bne handlinger"}
            </span>
          </div>
          <div className="insight-list">
            {actionOrders.slice(0, 5).map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className="insight-row">
                <div>
                  <strong>{order.customerName}</strong>
                  <p>{order.locationLabel}</p>
                </div>
                <span className="pill danger">{order.actionRequiredCount} kr&aelig;ver handling</span>
              </Link>
            ))}
            {actionOrders.length === 0 && (
              <div className="empty-state-inline">
                Alle importerede bestillinger er klar til videre behandling.
              </div>
            )}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Klar til n&aelig;ste flow</p>
              <h2>N&aelig;ste bestillinger at sende</h2>
            </div>
            <span className="pill neutral">{readyOrders.length} bestillinger</span>
          </div>
          <div className="insight-list">
            {readyOrders.map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className="insight-row">
                <div>
                  <strong>{order.customerName}</strong>
                  <p>
                    {order.locationLabel} · {order.readyLineCount} linjer klar til Send til ordre
                  </p>
                </div>
                <span className="pill success">
                  {order.lineCount} linjer i bestillingen
                </span>
              </Link>
            ))}
            {readyOrders.length === 0 && (
              <div className="empty-state-inline">
                Ingen bestillinger er helt klar endnu. Afklar varelinjer i venstre kolonne f&oslash;rst.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="panel-stack">
        <OrdersOverviewTable orders={orders} source={source} message={message} />
      </section>
    </main>
  );
}
