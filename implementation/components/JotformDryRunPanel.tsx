'use client';

import { useState } from 'react';

interface EnvRow {
  key: string;
  present: boolean;
}

interface EnvStatusResponse {
  success: boolean;
  ready: boolean;
  devBypassAuth: boolean;
  env: EnvRow[];
}

interface DryRunLine {
  lineNumber: number;
  rawProductNumber: string | null;
  rawProductName: string | null;
  quantity: number | null;
  matched: boolean;
  needsAction: boolean;
}

interface DryRunItem {
  submissionId: string;
  locationLabel: string | null;
  customerMatched: boolean;
  lineCount: number;
  lines: DryRunLine[];
}

interface DryRunResponse {
  success: boolean;
  dryRun: boolean;
  skippedExisting: number;
  fetchedNewSubmissions: number;
  preview: DryRunItem[];
}

export default function JotformDryRunPanel() {
  const [envStatus, setEnvStatus] = useState<EnvStatusResponse | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResponse | null>(null);
  const [loadingEnv, setLoadingEnv] = useState(false);
  const [loadingDryRun, setLoadingDryRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEnvStatus() {
    setLoadingEnv(true);
    setError(null);

    try {
      const response = await fetch('/api/health/env');
      const data = (await response.json()) as EnvStatusResponse;
      if (!response.ok) {
        throw new Error('Kunne ikke hente miljøstatus');
      }
      setEnvStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl');
    } finally {
      setLoadingEnv(false);
    }
  }

  async function runDryRun() {
    setLoadingDryRun(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/orders/jotform?dryRun=true', {
        method: 'POST',
      });
      const data = (await response.json()) as DryRunResponse | { error?: string };
      if (!response.ok) {
        throw new Error(
          'error' in data && data.error ? data.error : 'Dry run fejlede'
        );
      }
      setDryRunResult(data as DryRunResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl');
    } finally {
      setLoadingDryRun(false);
    }
  }

  return (
    <section className="panel-stack">
      <div className="card">
        <div className="card-header">
          <div>
            <p className="kicker">UI test</p>
            <h2>Jotform Dry Run</h2>
          </div>
          <div className="button-row">
            <button className="button secondary" onClick={loadEnvStatus} disabled={loadingEnv}>
              {loadingEnv ? 'Henter miljø...' : 'Hent miljøstatus'}
            </button>
            <button className="button" onClick={runDryRun} disabled={loadingDryRun}>
              {loadingDryRun ? 'Kører dry run...' : 'Kør dry run'}
            </button>
          </div>
        </div>

        <p className="muted">
          Brug denne side til at teste Jotform-flowet uden at skrive til databasen.
        </p>

        {error && <div className="alert danger">{error}</div>}
      </div>

      <div className="two-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Status</p>
              <h3>Miljø</h3>
            </div>
            {envStatus && (
              <span className={`pill ${envStatus.ready ? 'success' : 'warning'}`}>
                {envStatus.ready ? 'Klar' : 'Mangler nøgler'}
              </span>
            )}
          </div>

          {envStatus ? (
            <div className="env-list">
              {envStatus.env.map((row) => (
                <div className="env-row" key={row.key}>
                  <span className="code">{row.key}</span>
                  <span className={`pill ${row.present ? 'success' : 'danger'}`}>
                    {row.present ? 'klar' : 'mangler'}
                  </span>
                </div>
              ))}
              <div className="env-row">
                <span className="code">DEV_BYPASS_AUTH</span>
                <span className={`pill ${envStatus.devBypassAuth ? 'warning' : 'neutral'}`}>
                  {envStatus.devBypassAuth ? 'aktiv' : 'slået fra'}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted">Ingen miljøstatus hentet endnu.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <p className="kicker">Resultat</p>
              <h3>Dry Run Oversigt</h3>
            </div>
          </div>

          {dryRunResult ? (
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label">Nye submissions</span>
                <strong>{dryRunResult.fetchedNewSubmissions}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Skippede</span>
                <strong>{dryRunResult.skippedExisting}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Preview rows</span>
                <strong>{dryRunResult.preview.length}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Kør en dry run for at se preview af importen.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <p className="kicker">Preview</p>
            <h3>Submissions</h3>
          </div>
        </div>

        {dryRunResult && dryRunResult.preview.length > 0 ? (
          <div className="preview-list">
            {dryRunResult.preview.map((item) => (
              <article className="preview-card" key={item.submissionId}>
                <div className="preview-head">
                  <div>
                    <strong>{item.locationLabel ?? 'Ukendt lokation'}</strong>
                    <p className="muted">Submission: {item.submissionId}</p>
                  </div>
                  <div className="button-row">
                    <span className={`pill ${item.customerMatched ? 'success' : 'danger'}`}>
                      {item.customerMatched ? 'Kunde matchet' : 'Kunde mangler'}
                    </span>
                    <span className="pill neutral">{item.lineCount} linjer</span>
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Linje</th>
                      <th>Varenr.</th>
                      <th>Navn</th>
                      <th>Antal</th>
                      <th>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.lines.map((line) => (
                      <tr key={`${item.submissionId}-${line.lineNumber}`}>
                        <td>{line.lineNumber}</td>
                        <td>{line.rawProductNumber ?? '–'}</td>
                        <td>{line.rawProductName ?? '–'}</td>
                        <td>{line.quantity ?? '–'}</td>
                        <td>
                          <span
                            className={`pill ${
                              line.needsAction
                                ? 'danger'
                                : line.matched
                                  ? 'success'
                                  : 'neutral'
                            }`}
                          >
                            {line.needsAction
                              ? 'Kræver handling'
                              : line.matched
                                ? 'Matchet'
                                : 'Ukendt'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Ingen preview-data endnu.</p>
        )}
      </div>
    </section>
  );
}
