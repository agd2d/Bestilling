'use client';

import { useState, useTransition } from 'react';

export default function CreatePurchaseOrderButton({
  supplierId,
  lineIds,
  emailSubject,
  emailBody,
}: {
  supplierId: string;
  lineIds: string[];
  emailSubject: string;
  emailBody: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function createDraft() {
    setMessage(null);

    const response = await fetch('/api/orders/purchase-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplierId,
        lineIds,
        emailSubject,
        emailBody,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? 'Leverandørordre kunne ikke gemmes');
      return;
    }

    setMessage(data.message ?? 'Leverandørordre gemt');
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <div className="purchase-action-wrap">
      <button type="button" className="button" onClick={() => void createDraft()} disabled={isPending}>
        {isPending ? 'Afgiver leverandørordre...' : 'Afgiv ordre og lås'}
      </button>
      {message ? <p className="table-meta">{message}</p> : null}
    </div>
  );
}
