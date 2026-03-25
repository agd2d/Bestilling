'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { OrderNoteItem } from '@/lib/orders/order-notes-actions';

export default function OrderNotesPanel({
  requestId,
  notes,
  source,
}: {
  requestId: string;
  notes: OrderNoteItem[];
  source: 'live' | 'mock';
}) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function submitNote() {
    if (!value.trim()) {
      setMessage('Skriv en note først.');
      return;
    }

    const response = await fetch(`/api/orders/requests/${requestId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note: value }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? 'Noten kunne ikke gemmes');
      return;
    }

    setMessage(data.message ?? 'Noten er gemt');
    setValue('');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="kicker">Noter</p>
          <h2>Ordrenoter</h2>
        </div>
        <span className={`pill ${source === 'live' ? 'success' : 'warning'}`}>
          {source === 'live' ? 'Live data' : 'Mock fallback'}
        </span>
      </div>

      <div className="notes-list">
        {notes.length > 0 ? (
          notes.map((note) => (
            <article className="note-item" key={note.id}>
              <strong>{note.author}</strong>
              <p className="table-meta">{note.createdAt}</p>
              <p>{note.note}</p>
            </article>
          ))
        ) : (
          <p className="muted">Ingen noter endnu.</p>
        )}
      </div>

      <div className="note-form">
        <textarea
          className="note-textarea"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Skriv en intern note til ordren..."
          rows={4}
          disabled={isPending}
        />
        <div className="button-row">
          <button className="button" type="button" onClick={() => void submitNote()} disabled={isPending}>
            {isPending ? 'Gemmer...' : 'Gem note'}
          </button>
        </div>
        {message && <p className="table-meta">{message}</p>}
      </div>
    </div>
  );
}
