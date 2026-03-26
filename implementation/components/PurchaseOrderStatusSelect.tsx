'use client';

import { useState } from 'react';
import {
  formatPurchaseOrderStatus,
  purchaseOrderStatusOptions,
} from '@/lib/orders/purchase-order-status-options';

export default function PurchaseOrderStatusSelect({
  purchaseOrderId,
  currentStatus,
}: {
  purchaseOrderId: string;
  currentStatus: string;
}) {
  const [value, setValue] = useState(currentStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleChange(nextStatus: string) {
    setValue(nextStatus);
    setMessage(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/orders/purchase-orders/${purchaseOrderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? 'Status kunne ikke opdateres');
        setIsPending(false);
        return;
      }

      if (nextStatus === 'partially_delivered') {
        window.location.assign('/customer-invoicing');
        return;
      }

      setMessage(data.message ?? 'Status opdateret');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Status kunne ikke opdateres');
      setIsPending(false);
    }
  }

  const availableOptions = Array.from(new Set([value, ...purchaseOrderStatusOptions]));

  return (
    <div className="status-select-wrap">
      <label className="status-label">
        Leverandørordre-status
        <select
          className="status-select"
          value={value}
          onChange={(event) => void handleChange(event.target.value)}
          disabled={isPending}
        >
          {availableOptions.map((status) => (
            <option key={status} value={status}>
              {formatPurchaseOrderStatus(status)}
            </option>
          ))}
        </select>
      </label>
      {message ? <p className="table-meta">{message}</p> : null}
    </div>
  );
}
