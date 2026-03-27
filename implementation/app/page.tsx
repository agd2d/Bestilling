import Link from "next/link";

import { getOrdersListData } from "@/lib/orders/order-queries";
import {
  getPurchaseDraftsData,
  getSavedPurchaseOrdersData,
} from "@/lib/orders/purchase-order-queries";
import { getProductCatalogData } from "@/lib/products/product-catalog-queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [ordersResult, purchaseDraftsResult, purchaseOrdersResult, productCatalogResult] =
    await Promise.all([
      getOrdersListData(),
      getPurchaseDraftsData(),
      getSavedPurchaseOrdersData(),
      getProductCatalogData(),
    ]);

  const orders = ordersResult.orders;
  const purchaseDrafts = purchaseDraftsResult.groups;
  const purchaseOrders = purchaseOrdersResult.purchaseOrders;
  const productCatalog = productCatalogResult.items;

  const actionOrders = orders.filter((order) => order.actionRequiredCount > 0);
  const readyOrders = orders.filter((order) => order.actionRequiredCount === 0);
  const readyLines = orders.flatMap((order) =>
    order.lines.filter((line) => line.status.toLowerCase().includes("klar"))
  ).length;
  const openDraftLines = purchaseDrafts.reduce((sum, group) => sum + group.lineCount, 0);
  const supplierOrdersInProgress = purchaseOrders.filter((purchaseOrder) =>
    ["draft", "sent", "confirmed"].includes(purchaseOrder.status)
  );
  const readyForInvoicing = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === "partially_delivered"
  );
  const recentlyUsedProducts = [...productCatalog]
    .filter((product) => product.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 4);
  const newestOrder = orders[0];

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="kicker">Arbejdsbord</p>
        <div className="card-header">
          <div>
            <h1>Overblik til varebestilleren</h1>
            <p>
              Start her for at se, hvad der skal afklares nu, hvad der er klar til bestilling,
              og hvilke leverandoerordrer der er paa vej videre i flowet.
            </p>
          </div>
          <div className="button-row">
            <Link className="button" href="/orders">
              Aabn varebestilling
            </Link>
            <Link className="button secondary" href="/purchase-orders">
              Aabn leverandoerordre
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">Kraever handling nu</span>
            <strong className="metric-inline">{actionOrders.length}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Klar i varebestilling</span>
            <strong className="metric-inline">{readyLines}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Nye leverandoerkladder</span>
            <strong className="metric-inline">{purchaseDrafts.length}</strong>
          </div>
        </div>
      </section>

      <section className="panel-stack orders-dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Varebestilling</p>
              <h2>Det vigtigste lige nu</h2>
            </div>
            <span className={`pill ${actionOrders.length > 0 ? "danger" : "success"}`}>
              {actionOrders.length > 0 ? "Handling foerst" : "Ingen aabne blokeringer"}
            </span>
          </div>

          <div className="insight-list">
            {actionOrders.slice(0, 5).map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className="insight-row">
                <div>
                  <strong>{order.customerName}</strong>
                  <p>
                    {order.locationLabel} · {order.actionRequiredCount} linjer skal afklares
                  </p>
                </div>
                <span className="pill danger">Aabn bestilling</span>
              </Link>
            ))}
            {actionOrders.length === 0 ? (
              <div className="empty-state-inline">
                Ingen bestillinger blokerer lige nu. Du kan gaa videre med det, der er klar.
              </div>
            ) : null}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Naeste trin</p>
              <h2>Klar til videre flow</h2>
            </div>
            <span className="pill neutral">{readyOrders.length} bestillinger</span>
          </div>

          <div className="insight-list">
            <Link href="/orders" className="insight-row">
              <div>
                <strong>Varebestilling</strong>
                <p>
                  {orders.length} aabne bestillinger · {readyLines} linjer staar som klar til
                  bestilling
                </p>
              </div>
              <span className="pill success">Aabn koeen</span>
            </Link>

            <Link href="/purchase-orders" className="insight-row">
              <div>
                <strong>Leverandoerkladder</strong>
                <p>
                  {purchaseDrafts.length} kladder · {openDraftLines} linjer venter paa at blive
                  samlet
                </p>
              </div>
              <span className="pill warning">Byg ordre</span>
            </Link>

            <Link href="/customer-invoicing" className="insight-row">
              <div>
                <strong>Fakturering til kunde</strong>
                <p>{readyForInvoicing.length} leverandoerordrer er klar til at gaa videre</p>
              </div>
              <span className="pill info">Foelg op</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="panel-stack orders-dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Hurtig status</p>
              <h2>Dagens arbejdsbillede</h2>
            </div>
            <span className="pill neutral">
              Seneste import {newestOrder ? newestOrder.createdAt : "ikke registreret"}
            </span>
          </div>

          <div className="dashboard-mini-grid">
            <div className="mini-stat-card">
              <strong>{orders.length}</strong>
              <p>Aabne kundebestillinger i varebestilling</p>
            </div>
            <div className="mini-stat-card">
              <strong>{supplierOrdersInProgress.length}</strong>
              <p>Leverandoerordrer er aktive og under opfoelgning</p>
            </div>
            <div className="mini-stat-card">
              <strong>{productCatalogResult.stats.usedProducts}</strong>
              <p>Varer er allerede brugt i registrerede ordrer</p>
            </div>
            <div className="mini-stat-card">
              <strong>{productCatalogResult.stats.totalProducts}</strong>
              <p>Varer ligger klar i kataloget til opslag og statistik</p>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Genveje</p>
              <h2>Arbejd direkte videre</h2>
            </div>
            <span className="pill neutral">4 faste indgange</span>
          </div>

          <div className="quick-link-grid">
            <Link href="/orders" className="quick-link-card">
              <strong>Varebestilling</strong>
              <p>Afklar linjer, noter og send bestillinger videre til ordre.</p>
            </Link>
            <Link href="/purchase-orders" className="quick-link-card">
              <strong>Leverandoerordre</strong>
              <p>Byg kladder, laas ordrer og foelg status hos leverandoeren.</p>
            </Link>
            <Link href="/products" className="quick-link-card">
              <strong>Varekatalog</strong>
              <p>Soeg i varer, varenumre og brugshistorik.</p>
            </Link>
            <Link href="/suppliers" className="quick-link-card">
              <strong>Leverandoerer</strong>
              <p>Tjek kontaktdata og mailmodtagere foer ordreafsendelse.</p>
            </Link>
          </div>
        </article>
      </section>

      <section className="panel-stack orders-dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Klar til ordre</p>
              <h2>Nye leverandoerkladder</h2>
            </div>
            <span className={`pill ${purchaseDraftsResult.source === "live" ? "success" : "warning"}`}>
              {purchaseDraftsResult.source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>

          <div className="insight-list">
            {purchaseDrafts.slice(0, 4).map((group) => (
              <Link href="/purchase-orders" key={group.supplierId} className="insight-row">
                <div>
                  <strong>{group.supplierName}</strong>
                  <p>
                    {group.lineCount} linjer · {group.customerCount} kunder
                  </p>
                </div>
                <span className="pill success">Klar til kladde</span>
              </Link>
            ))}
            {purchaseDrafts.length === 0 ? (
              <div className="empty-state-inline">
                Ingen nye kladder lige nu. Varebestilling kan behandles videre uden ventende
                leverandoersamling.
              </div>
            ) : null}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Varekatalog</p>
              <h2>Mest brugte varer lige nu</h2>
            </div>
            <span className={`pill ${productCatalogResult.source === "live" ? "success" : "warning"}`}>
              {productCatalogResult.source === "live" ? "Live data" : "Mock fallback"}
            </span>
          </div>

          <div className="insight-list">
            {recentlyUsedProducts.map((product) => (
              <Link href="/products" key={product.id} className="insight-row">
                <div>
                  <strong>
                    {product.productNumber} · {product.name}
                  </strong>
                  <p>
                    {product.supplierName} · {product.usageCount} ordrelinjer · senest{" "}
                    {product.lastOrderedAt ?? "-"}
                  </p>
                </div>
                <span className="pill neutral">{product.totalQuantity} bestilt</span>
              </Link>
            ))}
            {recentlyUsedProducts.length === 0 ? (
              <div className="empty-state-inline">
                Ingen varer er brugt endnu. Kataloget er klar, men der mangler aktivitet i ordrer.
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
