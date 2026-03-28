'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import {
  formatProductBillingCategory,
  type ProductBillingCategory,
} from '@/lib/products/product-category';

interface SupplierOption {
  id: string;
  name: string;
}

interface ProductRowEditorProps {
  product: {
    id: string;
    productNumber: string;
    name: string;
    supplierId: string | null;
    unit: string;
    defaultPrice: number | null;
    isActive: boolean;
    billingCategory: ProductBillingCategory;
  };
  suppliers: SupplierOption[];
}

export default function ProductRowEditor({ product, suppliers }: ProductRowEditorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    productNumber: product.productNumber,
    name: product.name,
    supplierId: product.supplierId ?? '',
    unit: product.unit === '-' ? '' : product.unit,
    defaultPrice: product.defaultPrice?.toString() ?? '',
    isActive: product.isActive,
    billingCategory: product.billingCategory,
  });

  useEffect(() => {
    setForm({
      productNumber: product.productNumber,
      name: product.name,
      supplierId: product.supplierId ?? '',
      unit: product.unit === '-' ? '' : product.unit,
      defaultPrice: product.defaultPrice?.toString() ?? '',
      isActive: product.isActive,
      billingCategory: product.billingCategory,
    });
  }, [product]);

  async function save() {
    setMessage(null);

    const response = await fetch(`/api/products/${product.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productNumber: form.productNumber.trim(),
        name: form.name.trim(),
        supplierId: form.supplierId || null,
        unit: form.unit.trim() || null,
        defaultPrice: form.defaultPrice.trim() === '' ? null : Number(form.defaultPrice),
        isActive: form.isActive,
        billingCategory: form.billingCategory,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? 'Varen kunne ikke gemmes');
      return;
    }

    setMessage(data.message ?? 'Varen er gemt');
    setIsOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label={`Rediger ${product.name}`}
        onClick={() => {
          setMessage(null);
          setIsOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25Zm15.71-9.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.96 1.96 3.92 3.92 1.96-1.96Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="dialog-overlay" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className="dialog-card compact-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Rediger vare ${product.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <p className="kicker">Vare</p>
                <h3>Rediger varelinje</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Luk redigering"
                onClick={() => setIsOpen(false)}
              >
                x
              </button>
            </div>

            <div className="line-editor-grid">
              <label className="editor-field">
                <span>Varenummer</span>
                <input
                  className="editor-input"
                  value={form.productNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, productNumber: event.target.value }))
                  }
                  disabled={isPending}
                />
              </label>

              <label className="editor-field">
                <span>Varenavn</span>
                <input
                  className="editor-input"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  disabled={isPending}
                />
              </label>

              <label className="editor-field">
                <span>Leverandør</span>
                <select
                  className="editor-input"
                  value={form.supplierId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, supplierId: event.target.value }))
                  }
                  disabled={isPending}
                >
                  <option value="">Ingen leverandør</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-field">
                <span>Enhed</span>
                <input
                  className="editor-input"
                  value={form.unit}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unit: event.target.value }))
                  }
                  disabled={isPending}
                />
              </label>

              <label className="editor-field">
                <span>Pris</span>
                <input
                  className="editor-input"
                  type="number"
                  step="0.01"
                  value={form.defaultPrice}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, defaultPrice: event.target.value }))
                  }
                  disabled={isPending}
                />
              </label>

              <label className="editor-field">
                <span>Status</span>
                <select
                  className="editor-input"
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.value === 'active',
                    }))
                  }
                  disabled={isPending}
                >
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                </select>
              </label>

              <label className="editor-field editor-field-wide">
                <span>Varetype</span>
                <select
                  className="editor-input"
                  value={form.billingCategory}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      billingCategory: event.target.value as ProductBillingCategory,
                    }))
                  }
                  disabled={isPending}
                >
                  <option value="material_cost">{formatProductBillingCategory('material_cost')}</option>
                  <option value="resale_consumable">
                    {formatProductBillingCategory('resale_consumable')}
                  </option>
                  <option value="equipment_purchase">
                    {formatProductBillingCategory('equipment_purchase')}
                  </option>
                  <option value="subcontractor_purchase">
                    {formatProductBillingCategory('subcontractor_purchase')}
                  </option>
                  <option value="window_cleaning_service">
                    {formatProductBillingCategory('window_cleaning_service')}
                  </option>
                  <option value="mat_service">{formatProductBillingCategory('mat_service')}</option>
                </select>
              </label>
            </div>

            {message ? <p className="table-meta">{message}</p> : null}

            <div className="button-row">
              <button type="button" className="button" onClick={() => void save()} disabled={isPending}>
                {isPending ? 'Gemmer...' : 'Gem'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
