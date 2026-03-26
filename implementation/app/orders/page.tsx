import Link from "next/link";
import OrdersOverviewTable from "@/components/OrdersOverviewTable";
import { getOrdersListData } from "@/lib/orders/order-queries";

export default async function OrdersPage() {
  const { orders, source, message } = await getOrdersListData();
  const totalLines = orders.reduce((sum, order) => sum + order.lineCount, 0);
  const actionOrders = orders.filter((order) => order.actionRequiredCount > 0);
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
          bestillinger, som stadig er i varebestilling, vises her. Når en bestilling godkendes
          med knappen "Send til ordre", flyttes den ud af denne liste og videre til{" "}
          <Link href="/purchase-orders">Leverandørordre</Link>.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Åbne bestillinger</strong>
            <p className="metric-inline">{orders.length}</p>
            <p className="metric-subtext">{totalLines} linjer i alt</p>
          </article>
          <article className="card">
            <strong>Linjer klar til bestilling</strong>
            <p className="metric-inline">{readyLines}</p>
            <p className="metric-subtext">{supplierSummary.length} aktive leverandører</p>
          </article>
          <article className="card">
            <strong>Kræver handling</strong>
            <p className="metric-inline">{actionOrders.length}</p>
            <p className="metric-subtext">{actionLines} linjer skal afklares</p>
          </article>
          <article className="card">
            <strong>Seneste import</strong>
            <p className="metric-inline">{newestOrder ? newestOrder.createdAt : "-"}</p>
            <p>
              Dry run og miljøstatus findes stadig på <Link href="/">forsiden</Link>.
            </p>
          </article>
        </div>
      </section>

      <section className="panel-stack orders-dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Fokus nu</p>
              <h2>Handling først</h2>
            </div>
            <span className={`pill ${actionLines > 0 ? "danger" : "success"}`}>
              {actionLines > 0 ? `${actionLines} linjer åbne` : "Ingen åbne handlinger"}
            </span>
          </div>
          <div className="insight-list">
            {actionOrders.slice(0, 5).map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className="insight-row">
                <div>
                  <strong>{order.customerName}</strong>
                  <p>{order.locationLabel}</p>
                </div>
                <span className="pill danger">{order.actionRequiredCount} kræver handling</span>
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
              <p className="kicker">Klar til næste flow</p>
              <h2>Send til ordre</h2>
            </div>
            <span className="pill neutral">{supplierSummary.length} leverandører</span>
          </div>
          <div className="insight-list">
            {supplierSummary.map((supplier) => (
              <div key={supplier.supplier} className="insight-row static">
                <div>
                  <strong>{supplier.supplier}</strong>
                  <p>{supplier.lineCount} linjer fra kundebestillinger</p>
                </div>
                <span className={`pill ${supplier.actionCount > 0 ? "warning" : "success"}`}>
                  {supplier.actionCount > 0
                    ? `${supplier.actionCount} kræver afklaring`
                    : "Klar til Send til ordre"}
                </span>
              </div>
            ))}
            {supplierSummary.length === 0 && (
              <div className="empty-state-inline">
                Ingen leverandøroversigt endnu. Importér ordrer for at samle linjer.
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
