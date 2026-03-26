'use client';

import { useState } from 'react';

export default function SupplierMailButton({
  to,
  subject,
  body,
  label = 'Send ordre-mail',
  purchaseOrderId,
}: {
  to: string | null;
  subject: string;
  body: string;
  label?: string;
  purchaseOrderId?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const disabled = !to;

  function openMailClient() {
    if (!to) return;

    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
  }

  async function handleClick() {
    setMessage(null);

    if (!purchaseOrderId) {
      openMailClient();
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/orders/purchase-orders/${purchaseOrderId}/send-mail`, {
        method: 'POST',
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? 'Ordre-mail kunne ikke sendes');
        setIsPending(false);
        return;
      }

      setMessage(data.message ?? 'Ordre-mail sendt');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ordre-mail kunne ikke sendes');
      setIsPending(false);
    }
  }

  return (
    <div className="purchase-action-wrap">
      <button
        type="button"
        className={`button ${disabled ? 'secondary' : ''}`}
        onClick={() => void handleClick()}
        disabled={disabled || isPending}
      >
        {disabled
          ? 'Mangler ordre-e-mail'
          : isPending
            ? 'Sender ordre-mail...'
            : label}
      </button>
      {message ? <p className="table-meta">{message}</p> : null}
    </div>
  );
}
