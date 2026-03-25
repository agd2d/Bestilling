'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { OrderLabelOption, getLabelTone } from '@/lib/orders/order-labels';

export default function OrderLabelsPanel({
  requestId,
  availableLabels,
  selectedLabelNames,
  source,
}: {
  requestId: string;
  availableLabels: OrderLabelOption[];
  selectedLabelNames: string[];
  source: 'live' | 'mock';
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(selectedLabelNames);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function toggleLabel(label: OrderLabelOption) {
    const nextSelected = !selected.includes(label.name);
    setMessage(null);

    const response = await fetch(`/api/orders/requests/${requestId}/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        labelId: label.id,
        selected: nextSelected,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? 'Label kunne ikke opdateres');
      return;
    }

    setSelected((current) =>
      nextSelected ? [...current, label.name] : current.filter((item) => item !== label.name)
    );
    setMessage(data.message ?? 'Label opdateret');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="kicker">Labels</p>
          <h2>Ordrelabels</h2>
        </div>
        <span className={`pill ${source === 'live' ? 'success' : 'warning'}`}>
          {source === 'live' ? 'Live data' : 'Mock fallback'}
        </span>
      </div>

      <div className="label-selector-grid">
        {availableLabels.map((label) => {
          const isSelected = selected.includes(label.name);

          return (
            <button
              key={label.id}
              type="button"
              className={`label-toggle ${isSelected ? 'selected' : ''}`}
              onClick={() => void toggleLabel(label)}
              disabled={isPending}
            >
              <span className={`pill ${getLabelTone(label.name, label.color)}`}>{label.name}</span>
              <span className="label-toggle-meta">
                {isSelected ? 'Valgt på ordren' : 'Klik for at tilføje'}
              </span>
            </button>
          );
        })}
      </div>

      {message && <p className="table-meta">{message}</p>}
    </div>
  );
}
