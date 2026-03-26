'use client';

import { useState } from 'react';

export default function PurchaseOrderLifecycleButtons({
  purchaseOrderId,
  currentStatus,
}: {
  purchaseOrderId: string;
  currentStatus: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function runAction(action: 'reopen' | 'cancel' | 'close') {
    setMessage(null);

    const confirmText =
      action === 'cancel'
        ? 'Er du sikker på, at leverandørordren skal annulleres?'
        : action === 'reopen'
          ? 'Er du sikker på, at leverandørordren skal åbnes igen?'
          : 'Er du sikker på, at ordren skal lukkes og markeres som afgivet igen?';

    if (!window.confirm(confirmText)) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/orders/purchase-orders/${purchaseOrderId}/lifecycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? 'Ordren kunne ikke opdateres');
        setIsPending(false);
        return;
      }

      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ordren kunne ikke opdateres');
      setIsPending(false);
    }
  }

  return (
    <div className="button-row">
      {currentStatus === 'draft' ? (
        <button
          type="button"
          className="button"
          onClick={() => void runAction('close')}
          disabled={isPending}
        >
          Luk ordre igen
        </button>
      ) : (
        <button
          type="button"
          className="button secondary"
          onClick={() => void runAction('reopen')}
          disabled={isPending || currentStatus === 'cancelled'}
        >
          Åbn ordre
        </button>
      )}

      <button
        type="button"
        className="button secondary"
        onClick={() => void runAction('cancel')}
        disabled={isPending || currentStatus === 'cancelled'}
      >
        Annuller ordre
      </button>

      {message ? <p className="table-meta">{message}</p> : null}
    </div>
  );
}
