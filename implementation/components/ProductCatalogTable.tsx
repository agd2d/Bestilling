"use client";

import { useDeferredValue, useState } from "react";

import type { ProductCatalogItem } from "@/lib/products/product-catalog-queries";

interface ProductCatalogTableProps {
  items: ProductCatalogItem[];
}

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
  }).format(value);
}

export function ProductCatalogTable({ items }: ProductCatalogTableProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("da-DK");

  const filteredItems = normalizedQuery
    ? items.filter((product) =>
        [
          product.productNumber,
          product.name,
          product.supplierName,
          product.unit,
          product.isActive ? "aktiv" : "inaktiv",
          product.isActive ? "active" : "inactive",
        ].some((value) => value.toLocaleLowerCase("da-DK").includes(normalizedQuery))
      )
    : items;

  return (
    <>
      <div className="catalog-toolbar">
        <label className="catalog-search">
          <span className="catalog-search-label">S&oslash;g i varekatalog</span>
          <input
            className="editor-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="S&oslash;g p&aring; varenummer, navn eller leverand&oslash;r"
          />
        </label>

        <p className="catalog-search-meta">
          Viser {filteredItems.length} af {items.length} varer
        </p>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Varenummer</th>
              <th>Varenavn</th>
              <th>Leverand&oslash;r</th>
              <th>Enhed</th>
              <th>Pris</th>
              <th>Status</th>
              <th>Ordrelinjer</th>
              <th>Antal bestilt</th>
              <th>Senest brugt</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className="code">{product.productNumber}</span>
                  </td>
                  <td>{product.name}</td>
                  <td>{product.supplierName}</td>
                  <td>{product.unit}</td>
                  <td>{formatPrice(product.defaultPrice)}</td>
                  <td>
                    <span className={`pill ${product.isActive ? "success" : "neutral"}`}>
                      {product.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td>{product.usageCount}</td>
                  <td>{product.totalQuantity}</td>
                  <td>{product.lastOrderedAt ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state-inline">
                    Ingen varer matcher s&oslash;gningen. Pr&oslash;v et andet varenummer, navn
                    eller leverand&oslash;rnavn.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
