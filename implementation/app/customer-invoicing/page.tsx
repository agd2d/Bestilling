export default function CustomerInvoicingPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="code">/customer-invoicing</p>
        <h1>Fakturering til kunde</h1>
        <p>
          Her lander leverandørordrer, når ordren er modtaget ved kunden og er klar til næste
          trin i processen.
        </p>

        <div className="grid">
          <article className="card">
            <strong>Næste flowtrin</strong>
            <p className="metric-inline">Klar</p>
          </article>
          <article className="card">
            <strong>Kilde</strong>
            <p className="metric-inline">Leverandørordre</p>
          </article>
        </div>
      </section>

      <section className="panel-stack">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Flow</p>
              <h2>Klar til fakturering</h2>
            </div>
            <span className="pill neutral">Næste trin</span>
          </div>
          <p className="muted">
            Ordredata skal flyde hertil efter statusen “Ordre modtaget ved kunden”.
          </p>
        </article>
      </section>
    </main>
  );
}
