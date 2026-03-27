import { ProductCatalogTable } from "@/components/ProductCatalogTable";
import { getProductCatalogData } from "@/lib/products/product-catalog-queries";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { items, stats, source, message } = await getProductCatalogData();
  const topProducts = [...items].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="kicker">Varekatalog</p>
        <div className="card-header">
          <div>
            <h1>Varer og statistik</h1>
            <p>
              Her ligger varekartoteket, som binder kundebestillinger,
              leverand&oslash;rordrer og senere statistik sammen.
            </p>
          </div>
          <span className={`pill ${source === "live" ? "success" : "warning"}`}>
            {source === "live" ? "Live data" : "Mock fallback"}
          </span>
        </div>
        {message ? <p className="muted">{message}</p> : null}

        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">Varer i katalog</span>
            <strong className="metric-inline">{stats.totalProducts}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Aktive varer</span>
            <strong className="metric-inline">{stats.activeProducts}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Varer brugt i ordrer</span>
            <strong className="metric-inline">{stats.usedProducts}</strong>
          </div>
        </div>
      </section>

      <section className="panel-stack">
        <div className="grid">
          <article className="card">
            <strong>Statistikgrundlag</strong>
            <p className="muted">
              Statistikken beregnes ud fra varelinjer, der er koblet direkte til katalogets varer.
            </p>
            <p className="metric-inline">{stats.totalOrderedQuantity}</p>
            <p className="metric-subtext">
              Samlet bestilt antal p&aring; tv&aelig;rs af registrerede ordrer
            </p>
          </article>

          <article className="card">
            <strong>Mest bestilte varer</strong>
            <div className="insight-list">
              {topProducts.map((product) => (
                <div className="insight-row static" key={product.id}>
                  <div>
                    <strong>
                      {product.productNumber} &middot; {product.name}
                    </strong>
                    <p>
                      {product.supplierName} &middot; {product.totalQuantity} {product.unit}
                    </p>
                  </div>
                  <span className={`pill ${product.usageCount > 0 ? "success" : "neutral"}`}>
                    {product.usageCount} ordrelinjer
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Vareliste</p>
              <h2>Varekartotek</h2>
            </div>
            <span className="pill info">Klar til statistik</span>
          </div>

          <ProductCatalogTable items={items} />
        </article>
      </section>
    </main>
  );
}
