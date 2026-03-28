import ProductRowEditor from "@/components/ProductRowEditor";
import { getProductCatalogData } from "@/lib/products/product-catalog-queries";

export const dynamic = "force-dynamic";

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function ProductsPage() {
  const { items, suppliers, stats, source, message } = await getProductCatalogData();
  const topProducts = [...items].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="kicker">Varekatalog</p>
        <div className="card-header">
          <div>
            <h1>Varer, ydelser og statistik</h1>
            <p>
              Her ligger kataloget for varer og eksterne ydelser, som binder
              kundebestillinger, leverandørordrer og senere statistik sammen.
            </p>
          </div>
          <span className={`pill ${source === "live" ? "success" : "warning"}`}>
            {source === "live" ? "Live data" : "Mock fallback"}
          </span>
        </div>
        {message ? <p className="muted">{message}</p> : null}

        <div className="stats-grid products-stats-grid">
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
          <div className="stat-box">
            <span className="stat-label">Materialeomkostninger</span>
            <strong className="metric-inline">{stats.materialCostProducts}</strong>
            <p className="metric-subtext">{stats.materialCostQuantity} bestilte enheder</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Forbrugsvarer til kunde</span>
            <strong className="metric-inline">{stats.resaleConsumableProducts}</strong>
            <p className="metric-subtext">{stats.resaleConsumableQuantity} bestilte enheder</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Indkøb af udstyr</span>
            <strong className="metric-inline">{stats.equipmentPurchaseProducts}</strong>
            <p className="metric-subtext">{stats.equipmentPurchaseQuantity} bestilte enheder</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Indkøb af underleverance</span>
            <strong className="metric-inline">{stats.subcontractorPurchaseProducts}</strong>
            <p className="metric-subtext">{stats.subcontractorPurchaseQuantity} bestilte enheder</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Vinduespudsning</span>
            <strong className="metric-inline">{stats.windowCleaningServiceProducts}</strong>
            <p className="metric-subtext">{stats.windowCleaningServiceQuantity} bestilte enheder</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Måtteservice</span>
            <strong className="metric-inline">{stats.matServiceProducts}</strong>
            <p className="metric-subtext">{stats.matServiceQuantity} bestilte enheder</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Samlet bestilt antal</span>
            <strong className="metric-inline">{stats.totalOrderedQuantity}</strong>
          </div>
        </div>
      </section>

      <section className="panel-stack">
        <div className="grid">
          <article className="card">
            <strong>Statistikgrundlag</strong>
            <p className="muted">
              Statistikken beregnes ud fra ordrelinjer, der er koblet direkte til kataloget, og er
              nu delt i varer samt eksterne ydelser som vinduespudsning og måtteservice.
            </p>
            <p className="metric-inline">{stats.totalOrderedQuantity}</p>
            <p className="metric-subtext">Samlet bestilt antal på tværs af registrerede ordrer</p>
          </article>

          <article className="card">
            <strong>Mest bestilte varer og ydelser</strong>
            <div className="insight-list">
              {topProducts.map((product) => (
                <div className="insight-row static" key={product.id}>
                  <div>
                    <strong>
                      {product.productNumber} · {product.name}
                    </strong>
                    <p>
                      {product.supplierName} · {product.totalQuantity} {product.unit}
                    </p>
                  </div>
                  <div className="button-row">
                    <span className={`pill ${product.billingCategoryTone}`}>
                      {product.billingCategoryLabel}
                    </span>
                    <span className={`pill ${product.usageCount > 0 ? "success" : "neutral"}`}>
                      {product.usageCount} ordrelinjer
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Vareliste</p>
              <h2>Vare- og ydelseskartotek</h2>
            </div>
            <span className="pill info">Klar til statistik og fakturering</span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Varenummer</th>
                  <th>Varenavn</th>
                  <th>Leverandør</th>
                  <th>Varetype</th>
                  <th>Enhed</th>
                  <th>Pris</th>
                  <th>Status</th>
                  <th>Ordrelinjer</th>
                  <th>Antal bestilt</th>
                  <th>Senest brugt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <span className="code">{product.productNumber}</span>
                    </td>
                    <td>{product.name}</td>
                    <td>{product.supplierName}</td>
                    <td>
                      <div className="product-category-cell">
                        <span className={`pill ${product.billingCategoryTone}`}>
                          {product.billingCategoryLabel}
                        </span>
                      </div>
                    </td>
                    <td>{product.unit}</td>
                    <td>{formatPrice(product.defaultPrice)}</td>
                    <td>
                      <span className={`pill ${product.isActive ? "success" : "neutral"}`}>
                        {product.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td>{product.usageCount}</td>
                    <td>{product.totalQuantity}</td>
                    <td>{product.lastOrderedAt ?? "-"}</td>
                    <td className="action-cell">
                      <ProductRowEditor product={product} suppliers={suppliers} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
