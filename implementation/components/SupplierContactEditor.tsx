'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function SupplierContactEditor({
  supplier,
}: {
  supplier: {
    id: string;
    name: string;
    email: string | null;
    orderEmail: string | null;
    confirmationEmail: string | null;
    deliveryEmail: string | null;
    notes: string | null;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: supplier.name,
    email: supplier.email ?? '',
    orderEmail: supplier.orderEmail ?? '',
    confirmationEmail: supplier.confirmationEmail ?? '',
    deliveryEmail: supplier.deliveryEmail ?? '',
    notes: supplier.notes ?? '',
    isActive: supplier.isActive,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function save() {
    setMessage(null);

    const response = await fetch(`/api/suppliers/${supplier.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? 'Leverandøren kunne ikke gemmes');
      return;
    }

    setMessage(data.message ?? 'Leverandøren er gemt');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="line-editor">
      <div className="line-editor-grid">
        <label className="editor-field editor-field-wide">
          Leverandørnavn
          <input
            className="editor-input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label className="editor-field">
          Generel e-mail
          <input
            className="editor-input"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label className="editor-field">
          Ordre-e-mail
          <input
            className="editor-input"
            value={form.orderEmail}
            onChange={(event) =>
              setForm((current) => ({ ...current, orderEmail: event.target.value }))
            }
          />
        </label>
        <label className="editor-field">
          Bekræftelse
          <input
            className="editor-input"
            value={form.confirmationEmail}
            onChange={(event) =>
              setForm((current) => ({ ...current, confirmationEmail: event.target.value }))
            }
          />
        </label>
        <label className="editor-field">
          Levering
          <input
            className="editor-input"
            value={form.deliveryEmail}
            onChange={(event) =>
              setForm((current) => ({ ...current, deliveryEmail: event.target.value }))
            }
          />
        </label>
        <label className="editor-field editor-field-wide">
          Noter
          <textarea
            className="note-textarea"
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
      </div>

      <label className="label-toggle">
        <span>Aktiv leverandør</span>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) =>
            setForm((current) => ({ ...current, isActive: event.target.checked }))
          }
        />
      </label>

      <div className="purchase-action-wrap">
        <button type="button" className="button" onClick={() => void save()} disabled={isPending}>
          {isPending ? 'Gemmer leverandør...' : 'Gem leverandør'}
        </button>
        {message ? <p className="table-meta">{message}</p> : null}
      </div>
    </div>
  );
}
