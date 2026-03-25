import Link from "next/link";
import OrdersOverviewTable from "@/components/OrdersOverviewTable";
import { getOrdersListData } from "@/lib/orders/order-queries";

export default async function OrdersPage() {
  const { orders, source, message } = await getOrdersListData();
  const openOrders = orders.filter(
    (order) => !order.status.toLowerCase().includes("afsendt")
  );
  const actionOrders = orders.filter((order) => order.actionRequiredCount > 0);
  const readyLines = orders.flatMap((order) =>
    order.lines.filter((line) => line.status.toLowerCase().includes("klar"))
  ).length;

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/orders</p>
        <h1>Varebestilling</h1>
        <p>
          Første rigtige modulskærm i implementationen. Oversigten forsøger nu at
          hente data fra Supabase og falder tilbage til mockdata, hvis miljøet ikke
          er klar endnu.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Åbne bestillinger</strong>
            <p className="metric-inline">{openOrders.length}</p>
          </article>
          <article className="card">
            <strong>Linjer klar til bestilling</strong>
            <p className="metric-inline">{readyLines}</p>
          </article>
          <article className="card">
            <strong>Ordrer med handling</strong>
            <p className="metric-inline">{actionOrders.length}</p>
          </article>
          <article className="card">
            <strong>Testværktøj</strong>
            <p>
              Dry run og miljøstatus findes stadig på <Link href="/">forsiden</Link>.
            </p>
          </article>
        </div>
      </section>

      <section className="panel-stack">
        <OrdersOverviewTable orders={orders} source={source} message={message} />
      </section>
    </main>
  );
}
