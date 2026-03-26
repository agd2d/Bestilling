'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function OrderFlowButton({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      return;
    }

    setMessage(data.message ?? 'Flow opdateret');
    startTransition(() => {
      router.refresh();
    });
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
