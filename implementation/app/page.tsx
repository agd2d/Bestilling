import Link from "next/link";

import { getOrdersListData } from "@/lib/orders/order-queries";
import {
  getPurchaseDraftsData,
  getSavedPurchaseOrdersData,
} from "@/lib/orders/purchase-order-queries";
import { getProductCatalogData } from "@/lib/products/product-catalog-queries";

export const dynamic = "force-dynamic";

const copy = {
  overviewTitle: "Overblik til varebestilleren",
  overviewIntro:
    "Start her for at se, hvad der skal afklares nu, hvad der er klar til bestilling, og hvilke leverand\u00f8rordrer der er p\u00e5 vej videre i flowet.",
  openOrders: "\u00c5bn varebestilling",
  openPurchaseOrders: "\u00c5bn leverand\u00f8rordre",
  requiresAction: "Kr\u00e6ver handling nu",
  newDrafts: "Nye leverand\u00f8rkladder",
  handleFirst: "Handling f\u00f8rst",
  noOpenBlocks: "Ingen \u00e5bne blokeringer",
  openOrder: "\u00c5bn bestilling",
  goAhead: "Ingen bestillinger blokerer lige nu. Du kan g\u00e5 videre med det, der er klar.",
  nextStep: "N\u00e6ste trin",
  openQueue: "\u00c5bn k\u00f8en",
  draftGroups: "Leverand\u00f8rkladder",
  readyForMove: "F\u00f8lg op",
  quickStatus: "Hurtig status",
  openCustomerOrders: "\u00c5bne kundebestillinger i varebestilling",
  supplierFollowUp: "Leverand\u00f8rordrer er aktive og under opf\u00f8lgning",
  shortcuts: "Genveje",
  supplierOrder: "Leverand\u00f8rordre",
  supplierOrderDesc: "Byg kladder, l\u00e5s ordrer og f\u00f8lg status hos leverand\u00f8ren.",
  productSearch: "S\u00f8g i varer, varenumre og brugshistorik.",
  suppliers: "Leverand\u00f8rer",
  suppliersDesc: "Tjek kontaktdata og mailmodtagere f\u00f8r ordreafsendelse.",
  readyForOrder: "Klar til ordre",
  noDrafts:
    "Ingen nye kladder lige nu. Varebestilling kan behandles videre uden ventende leverand\u00f8rsamling.",
} as const;

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
            <h1>{copy.overviewTitle}</h1>
            <p>{copy.overviewIntro}</p>
          </div>
          <div className="button-row">
            <Link className="button" href="/orders">
              {copy.openOrders}
            </Link>
            <Link className="button secondary" href="/purchase-orders">
              {copy.openPurchaseOrders}
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">{copy.requiresAction}</span>
            <strong className="metric-inline">{actionOrders.length}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Klar i varebestilling</span>
            <strong className="metric-inline">{readyLines}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">{copy.newDrafts}</span>
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
              {actionOrders.length > 0 ? copy.handleFirst : copy.noOpenBlocks}
            </span>
          </div>

          <div className="insight-list">
            {actionOrders.slice(0, 5).map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className="insight-row">
                <div>
                  <strong>{order.customerName}</strong>
                  <p>
                    {order.locationLabel} {" \u00b7 "} {order.actionRequiredCount} linjer skal
                    afklares
                  </p>
                </div>
                <span className="pill danger">{copy.openOrder}</span>
              </Link>
            ))}
            {actionOrders.length === 0 ? (
              <div className="empty-state-inline">{copy.goAhead}</div>
            ) : null}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">{copy.nextStep}</p>
              <h2>Klar til videre flow</h2>
            </div>
            <span className="pill neutral">{readyOrders.length} bestillinger</span>
          </div>

          <div className="insight-list">
            <Link href="/orders" className="insight-row">
              <div>
                <strong>Varebestilling</strong>
                <p>
                  {orders.length} {"\u00e5bne"} bestillinger {" \u00b7 "} {readyLines} linjer
                  st\u00e5r som klar til bestilling
                </p>
              </div>
              <span className="pill success">{copy.openQueue}</span>
            </Link>

            <Link href="/purchase-orders" className="insight-row">
              <div>
                <strong>{copy.draftGroups}</strong>
                <p>
                  {purchaseDrafts.length} kladder {" \u00b7 "} {openDraftLines} linjer venter
                  p\u00e5 at blive samlet
                </p>
              </div>
              <span className="pill warning">Byg ordre</span>
            </Link>

            <Link href="/customer-invoicing" className="insight-row">
              <div>
                <strong>Fakturering til kunde</strong>
                <p>
                  {readyForInvoicing.length} leverand\u00f8rordrer er klar til at g\u00e5 videre
                </p>
              </div>
              <span className="pill info">{copy.readyForMove}</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="panel-stack orders-dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">{copy.quickStatus}</p>
              <h2>Dagens arbejdsbillede</h2>
            </div>
            <span className="pill neutral">
              Seneste import {newestOrder ? newestOrder.createdAt : "ikke registreret"}
            </span>
          </div>

          <div className="dashboard-mini-grid">
            <div className="mini-stat-card">
              <strong>{orders.length}</strong>
              <p>{copy.openCustomerOrders}</p>
            </div>
            <div className="mini-stat-card">
              <strong>{supplierOrdersInProgress.length}</strong>
              <p>{copy.supplierFollowUp}</p>
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
              <p className="kicker">{copy.shortcuts}</p>
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
              <strong>{copy.supplierOrder}</strong>
              <p>{copy.supplierOrderDesc}</p>
            </Link>
            <Link href="/products" className="quick-link-card">
              <strong>Varekatalog</strong>
              <p>{copy.productSearch}</p>
            </Link>
            <Link href="/suppliers" className="quick-link-card">
              <strong>{copy.suppliers}</strong>
              <p>{copy.suppliersDesc}</p>
            </Link>
          </div>
        </article>
      </section>

      <section className="panel-stack orders-dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">{copy.readyForOrder}</p>
              <h2>{copy.newDrafts}</h2>
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
                    {group.lineCount} linjer {" \u00b7 "} {group.customerCount} kunder
                  </p>
                </div>
                <span className="pill success">Klar til kladde</span>
              </Link>
            ))}
            {purchaseDrafts.length === 0 ? (
              <div className="empty-state-inline">{copy.noDrafts}</div>
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
                    {product.productNumber} {" \u00b7 "} {product.name}
                  </strong>
                  <p>
                    {product.supplierName} {" \u00b7 "} {product.usageCount} ordrelinjer {" \u00b7 "}
                    senest {product.lastOrderedAt ?? "-"}
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
