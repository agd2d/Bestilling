'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MockOrderLine, ProductOption, SupplierOption } from '@/lib/orders/mock-orders';

type ResolveMode = 'existing' | 'new' | 'ignore';

function defaultSupplierId(line: MockOrderLine, suppliers: SupplierOption[]) {
  const supplierByName = suppliers.find((supplier) => supplier.name === line.supplier);
  return line.supplierId ?? supplierByName?.id ?? '';
}

export default function OrderLinesEditor({
  requestId,
  lines,
  products,
  suppliers,
}: {
  requestId: string;
  lines: MockOrderLine[];
  products: ProductOption[];
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [openLineId, setOpenLineId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [createMessage, setCreateMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const initialState = useMemo(
    () =>
      Object.fromEntries(
        lines.map((line) => [
          line.id,
          {
            mode: (line.needsAction ? 'new' : 'existing') as ResolveMode,
            productId:
              line.productId ??
              products.find((product) => product.productNumber === line.productNumber)?.id ??
              '',
            productNumber: line.productNumber === '-' ? '' : line.productNumber,
            productName: line.productName === 'Ukendt vare' ? '' : line.productName,
            quantity: String(line.quantity ?? ''),
            supplierId: defaultSupplierId(line, suppliers),
            unit: line.unit ?? 'stk',
          },
        ])
      ),
    [lines, products, suppliers]
  );

  const [formState, setFormState] = useState(initialState);
  const [newLineState, setNewLineState] = useState({
    mode: 'existing' as Exclude<ResolveMode, 'ignore'>,
    productId: '',
    productNumber: '',
    productName: '',
    quantity: '1',
    supplierId: '',
    unit: 'stk',
  });

  function updateLineState(lineId: string, key: string, value: string) {
    setFormState((current) => ({
      ...current,
      [lineId]: {
        ...current[lineId],
        [key]: value,
      },
    }));
  }

  function updateNewLineState(key: string, value: string) {
    setNewLineState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveLine(lineId: string) {
    const lineState = formState[lineId];
    const response = await fetch(`/api/orders/lines/${lineId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lineState),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    setMessages((current) => ({
      ...current,
      [lineId]: response.ok ? data.message ?? 'Varelinje gemt' : data.error ?? 'Gemning fejlede',
    }));

    if (!response.ok) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function createLine() {
    const response = await fetch(`/api/orders/requests/${requestId}/lines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newLineState),
    });

    const data = (await response.json()) as { message?: string; error?: string };
    setCreateMessage(response.ok ? data.message ?? 'Varelinje tilføjet' : data.error ?? 'Kunne ikke tilføje vare');

    if (!response.ok) {
      return;
    }

    setNewLineState({
      mode: 'existing',
      productId: '',
      productNumber: '',
      productName: '',
      quantity: '1',
      supplierId: '',
      unit: 'stk',
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="kicker">Linjer</p>
          <h2>Ordrelinjer</h2>
        </div>
        <span className="pill neutral">{lines.length} linjer</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Varenr.</th>
            <th>Navn</th>
            <th>Antal</th>
            <th>Leverandør</th>
            <th>Status</th>
            <th>Handling</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const state = formState[line.id];
            const isOpen = openLineId === line.id;

            return (
              <Fragment key={line.id}>
                <tr>
                  <td>{line.productNumber}</td>
                  <td>
                    {line.productName}
                    {line.needsAction && (
                      <div className="table-meta danger-text">Kræver afklaring</div>
                    )}
                  </td>
                  <td>
                    {line.quantity}
                    {line.unit ? <div className="table-meta">{line.unit}</div> : null}
                  </td>
                  <td>{line.supplier}</td>
                  <td>
                    <span
                      className={`pill ${
                        line.needsAction
                          ? 'danger'
                          : line.rawStatus === 'ready_for_purchase'
                            ? 'success'
                            : line.rawStatus === 'cancelled'
                              ? 'neutral'
                              : 'warning'
                      }`}
                    >
                      {line.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setOpenLineId(isOpen ? null : line.id)}
                    >
                      {isOpen ? 'Luk' : 'Rediger varelinje'}
                    </button>
                  </td>
                </tr>
                {isOpen ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="line-editor">
                        <div className="line-editor-grid">
                          <div className="editor-field editor-field-wide">
                            Løsning
                            <div className="line-mode-grid compact">
                              <button
                                type="button"
                                className={`label-toggle ${state.mode === 'existing' ? 'selected' : ''}`}
                                onClick={() => updateLineState(line.id, 'mode', 'existing')}
                                disabled={isPending}
                              >
                                <span>Vælg vare</span>
                              </button>
                              <button
                                type="button"
                                className={`label-toggle ${state.mode === 'new' ? 'selected' : ''}`}
                                onClick={() => updateLineState(line.id, 'mode', 'new')}
                                disabled={isPending}
                              >
                                <span>Ny vare</span>
                              </button>
                              <button
                                type="button"
                                className={`label-toggle ${state.mode === 'ignore' ? 'selected' : ''}`}
                                onClick={() => updateLineState(line.id, 'mode', 'ignore')}
                                disabled={isPending}
                              >
                                <span>Ignorer</span>
                              </button>
                            </div>
                          </div>

                          <label className="editor-field">
                            Antal
                            <input
                              className="editor-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.quantity}
                              onChange={(event) =>
                                updateLineState(line.id, 'quantity', event.target.value)
                              }
                              disabled={isPending}
                            />
                          </label>

                          {state.mode === 'existing' ? (
                            <label className="editor-field editor-field-wide">
                              Vælg eksisterende vare
                              <select
                                className="status-select"
                                value={state.productId}
                                onChange={(event) =>
                                  updateLineState(line.id, 'productId', event.target.value)
                                }
                                disabled={isPending}
                              >
                                <option value="">Vælg vare</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.productNumber} - {product.name} ({product.supplierName})
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}

                          {state.mode === 'new' ? (
                            <>
                              <label className="editor-field">
                                Varenummer
                                <input
                                  className="editor-input"
                                  value={state.productNumber}
                                  onChange={(event) =>
                                    updateLineState(line.id, 'productNumber', event.target.value)
                                  }
                                  disabled={isPending}
                                />
                              </label>
                              <label className="editor-field editor-field-wide">
                                Varenavn
                                <input
                                  className="editor-input"
                                  value={state.productName}
                                  onChange={(event) =>
                                    updateLineState(line.id, 'productName', event.target.value)
                                  }
                                  disabled={isPending}
                                />
                              </label>
                              <label className="editor-field">
                                Leverandør
                                <select
                                  className="status-select"
                                  value={state.supplierId}
                                  onChange={(event) =>
                                    updateLineState(line.id, 'supplierId', event.target.value)
                                  }
                                  disabled={isPending}
                                >
                                  <option value="">Vælg leverandør</option>
                                  {suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                      {supplier.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="editor-field">
                                Enhed
                                <input
                                  className="editor-input"
                                  value={state.unit}
                                  onChange={(event) =>
                                    updateLineState(line.id, 'unit', event.target.value)
                                  }
                                  disabled={isPending}
                                />
                              </label>
                            </>
                          ) : null}

                          {state.mode === 'ignore' ? (
                            <div className="line-editor-note">
                              Linjen gemmes som ignoreret og fjernes fra videre bestilling.
                            </div>
                          ) : null}
                        </div>

                        <div className="button-row">
                          <button
                            type="button"
                            className="button"
                            onClick={() => void saveLine(line.id)}
                            disabled={isPending}
                          >
                            {isPending ? 'Gemmer...' : 'Gem valg'}
                          </button>
                          <span className="table-meta">
                            Antal, varevalg og nye varer gemmes samlet på linjen.
                          </span>
                        </div>

                        {messages[line.id] ? <p className="table-meta">{messages[line.id]}</p> : null}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="card nested-card">
        <div className="card-header">
          <div>
            <p className="kicker">Tilføj vare</p>
            <h3>Ny varelinje på ordren</h3>
          </div>
        </div>

        <div className="line-editor">
          <div className="line-editor-grid">
            <div className="editor-field editor-field-wide">
              Løsning
              <div className="line-mode-grid compact two-up">
                <button
                  type="button"
                  className={`label-toggle ${newLineState.mode === 'existing' ? 'selected' : ''}`}
                  onClick={() => updateNewLineState('mode', 'existing')}
                  disabled={isPending}
                >
                  <span>Vælg vare</span>
                </button>
                <button
                  type="button"
                  className={`label-toggle ${newLineState.mode === 'new' ? 'selected' : ''}`}
                  onClick={() => updateNewLineState('mode', 'new')}
                  disabled={isPending}
                >
                  <span>Ny vare</span>
                </button>
              </div>
            </div>

            <label className="editor-field">
              Antal
              <input
                className="editor-input"
                type="number"
                min="0"
                step="0.01"
                value={newLineState.quantity}
                onChange={(event) => updateNewLineState('quantity', event.target.value)}
                disabled={isPending}
              />
            </label>

            {newLineState.mode === 'existing' ? (
              <label className="editor-field editor-field-wide">
                Vælg eksisterende vare
                <select
                  className="status-select"
                  value={newLineState.productId}
                  onChange={(event) => updateNewLineState('productId', event.target.value)}
                  disabled={isPending}
                >
                  <option value="">Vælg vare</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productNumber} - {product.name} ({product.supplierName})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {newLineState.mode === 'new' ? (
              <>
                <label className="editor-field">
                  Varenummer
                  <input
                    className="editor-input"
                    value={newLineState.productNumber}
                    onChange={(event) => updateNewLineState('productNumber', event.target.value)}
                    disabled={isPending}
                  />
                </label>
                <label className="editor-field editor-field-wide">
                  Varenavn
                  <input
                    className="editor-input"
                    value={newLineState.productName}
                    onChange={(event) => updateNewLineState('productName', event.target.value)}
                    disabled={isPending}
                  />
                </label>
                <label className="editor-field">
                  Leverandør
                  <select
                    className="status-select"
                    value={newLineState.supplierId}
                    onChange={(event) => updateNewLineState('supplierId', event.target.value)}
                    disabled={isPending}
                  >
                    <option value="">Vælg leverandør</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="editor-field">
                  Enhed
                  <input
                    className="editor-input"
                    value={newLineState.unit}
                    onChange={(event) => updateNewLineState('unit', event.target.value)}
                    disabled={isPending}
                  />
                </label>
              </>
            ) : null}
          </div>

          <div className="button-row">
            <button type="button" className="button" onClick={() => void createLine()} disabled={isPending}>
              {isPending ? 'Tilføjer...' : 'Tilføj vare'}
            </button>
            <span className="table-meta">Brug den til ekstra varer, før ordren sendes videre.</span>
          </div>

          {createMessage ? <p className="table-meta">{createMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}
