'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  formatProductBillingCategory,
  type ProductBillingCategory,
} from '@/lib/products/product-category';

export default function ProductBillingCategoryEditor({
  productId,
  initialCategory,
}: {
  productId: string;
  initialCategory: ProductBillingCategory;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ProductBillingCategory>(initialCategory);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function save(nextValue: ProductBillingCategory) {
    setMessage(null);
    setValue(nextValue);

    const response = await fetch(`/api/products/${productId}/billing-category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billingCategory: nextValue,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? 'Varekategorien kunne ikke gemmes');
      setValue(initialCategory);
      return;
    }

    setMessage(data.message ?? 'Varekategorien er gemt');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="purchase-action-wrap">
      <select
        className="status-select"
        value={value}
        onChange={(event) => void save(event.target.value as ProductBillingCategory)}
        disabled={isPending}
      >
        <option value="material_cost">{formatProductBillingCategory('material_cost')}</option>
        <option value="resale_consumable">{formatProductBillingCategory('resale_consumable')}</option>
      </select>
      {message ? <p className="table-meta">{message}</p> : null}
    </div>
  );
}
