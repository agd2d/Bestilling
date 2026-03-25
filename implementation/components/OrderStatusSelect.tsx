'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatOrderStatus, orderStatusOptions } from '@/lib/orders/status-options';

export default function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleChange(nextStatus: string) {
    setValue(nextStatus);
    setMessage(null);

    const response = await fetch(`/api/orders/requests/${orderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? 'Status kunne ikke opdateres');
      return;
    }

    setMessage(data.message ?? 'Status opdateret');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="status-select-wrap">
      <label className="status-label">
        Ordrestatus
        <select
          className="status-select"
          value={value}
          onChange={(event) => void handleChange(event.target.value)}
          disabled={isPending}
        >
          {orderStatusOptions.map((status) => (
            <option key={status} value={status}>
              {formatOrderStatus(status)}
            </option>
          ))}
        </select>
      </label>
      {message && <p className="table-meta">{message}</p>}
    </div>
  );
}
