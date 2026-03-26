'use client';

import { useState } from 'react';

export default function OrderFlowButton({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const sendToOrder = currentStatus !== 'sent_to_supplier';
  const buttonLabel = sendToOrder ? 'Send til ordre' : 'Send ordre tilbage til kundebestillinger';
  const targetStatus = sendToOrder ? 'sent_to_supplier' : 'created';

  async function handleClick() {
    setMessage(null);

    if (!sendToOrder) {
      const confirmed = window.confirm(
        'Er du sikker på, at ordren skal sendes tilbage til kundebestillinger?'
      );

      if (!confirmed) {
        return;
      }
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/orders/requests/${orderId}/flow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetStatus }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? 'Flow kunne ikke opdateres');
        setIsPending(false);
        return;
      }

      window.location.assign(sendToOrder ? '/orders' : '/purchase-orders');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Flow kunne ikke opdateres');
      setIsPending(false);
    }
  }

  return (
    <div className="purchase-action-wrap">
      <button
        type="button"
        className={`button ${sendToOrder ? '' : 'secondary'}`}
        onClick={() => void handleClick()}
        disabled={isPending}
      >
        {isPending ? 'Opdaterer flow...' : buttonLabel}
      </button>
      {message ? <p className="table-meta">{message}</p> : null}
    </div>
  );
}
