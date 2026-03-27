"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MockOrder } from "@/lib/orders/mock-orders";

interface MergeMismatchOrder {
  id: string;
  customerId: string;
  customerName: string;
  locationLabel: string;
}

function pillClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("handling") || normalized.includes("kladde")) {
    return "pill danger";
  }
  if (normalized.includes("klar")) {
    return "pill success";
  }
  if (normalized.includes("afsendt")) {
    return "pill warning";
  }
  return "pill neutral";
}

function labelClass(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("haste")) return "pill danger";
  if (normalized.includes("restordre")) return "pill warning";
  if (normalized.includes("klar")) return "pill success";
  return "pill neutral";
}

function buildMismatchOrders(orders: MockOrder[]): MergeMismatchOrder[] {
  return orders.map((order) => ({
    id: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    locationLabel: order.locationLabel,
  }));
}

export default function OrdersOverviewTable({
  orders,
  source,
  message,
}: {
  orders: MockOrder[];
  source: "live" | "mock";
  message?: string;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [mismatchOrders, setMismatchOrders] = useState<MergeMismatchOrder[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.includes(order.id)),
    [orders, selectedIds]
  );

  function openOrder(orderId: string) {
    router.push(`/orders/${orderId}`);
  }

  function toggleSelection(orderId: string) {
    setFeedbackMessage("");
    setSelectedIds((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
    setFeedbackMessage("");
  }

  async function mergeSelectedOrders() {
    if (selectedOrders.length < 2) {
      setFeedbackMessage("Vælg mindst to bestillinger for at flette dem.");
      return;
    }

    const customerIds = Array.from(new Set(selectedOrders.map((order) => order.customerId)));
    if (customerIds.length > 1) {
      setMismatchOrders(buildMismatchOrders(selectedOrders));
      return;
    }

    setIsSubmitting(true);

    try {
      const targetOrder = selectedOrders[0];
      const response = await fetch("/api/orders/requests/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetOrderId: targetOrder.id,
          sourceOrderIds: selectedOrders.slice(1).map((order) => order.id),
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
        mismatch?: { orders: MergeMismatchOrder[] };
      };

      if (!response.ok) {
        if (data.mismatch?.orders?.length) {
          setMismatchOrders(data.mismatch.orders);
        } else {
          setFeedbackMessage(data.error ?? "Fletning fejlede.");
        }
        return;
      }

      setFeedbackMessage(data.message ?? "Bestillingerne er flettet.");
      setSelectedIds([]);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Der opstod en fejl under fletning."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <p className="kicker">Ordreoversigt</p>
            <h2>Kundebestillinger</h2>
          </div>
          <div className="button-row">
            <span className={`pill ${source === "live" ? "success" : "warning"}`}>
              {source === "live" ? "Live data" : "Mock fallback"}
            </span>
            <span className="pill neutral">{orders.length} ordrer</span>
          </div>
        </div>

        {message && <p className="muted">{message}</p>}

        <div className="merge-toolbar">
          <div>
            <strong>Flet kundebestillinger</strong>
            <p className="table-meta">
              Markér flere bestillinger for samme kunde og saml dem til én bestilling.
            </p>
          </div>
          <div className="button-row">
            <span className="pill neutral">{selectedIds.length} valgt</span>
            {selectedIds.length > 0 ? (
              <button type="button" className="button secondary" onClick={clearSelection}>
                Ryd valg
              </button>
            ) : null}
              <button
              type="button"
              className="button"
              onClick={() => void mergeSelectedOrders()}
              disabled={isPending || isSubmitting || selectedIds.length < 2}
            >
              {isPending || isSubmitting ? "Fletter..." : "Flet bestillinger"}
            </button>
          </div>
        </div>

        {feedbackMessage ? <p className="table-meta">{feedbackMessage}</p> : null}

        <table className="data-table">
          <thead>
            <tr>
              <th className="selection-column">Vælg</th>
              <th>Lokation</th>
              <th>Kunde</th>
              <th>Oprettet af</th>
              <th>Linjer</th>
              <th>Status</th>
              <th>Labels</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isSelected = selectedIds.includes(order.id);

              return (
                <tr
                  key={order.id}
                  className={`clickable-table-row ${isSelected ? "selected-table-row" : ""}`}
                  onClick={() => openOrder(order.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openOrder(order.id);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <td
                    className="selection-column"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="row-selector"
                      checked={isSelected}
                      onChange={() => toggleSelection(order.id)}
                      aria-label={`Vælg bestilling ${order.locationLabel}`}
                    />
                  </td>
                  <td>
                    <strong>{order.locationLabel}</strong>
                    <div className="table-meta">{order.createdAt}</div>
                  </td>
                  <td>{order.customerName}</td>
                  <td>{order.submittedBy}</td>
                  <td>
                    {order.lineCount}
                    {order.actionRequiredCount > 0 && (
                      <div className="table-meta danger-text">
                        {order.actionRequiredCount} kræver handling
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={pillClass(order.status)}>{order.status}</span>
                  </td>
                  <td>
                    {order.labels.length > 0 ? (
                      <div className="button-row">
                        {order.labels.map((label) => (
                          <span className={labelClass(label)} key={`${order.id}-${label}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="table-meta">Ingen labels</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mismatchOrders ? (
        <div className="dialog-overlay" role="presentation" onClick={() => setMismatchOrders(null)}>
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-mismatch-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <p className="kicker">Kan ikke flette</p>
                <h2 id="merge-mismatch-title">Bestillingerne matcher ikke kunde</h2>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={() => setMismatchOrders(null)}
              >
                Luk
              </button>
            </div>
            <p>
              Kun bestillinger fra samme kunde kan flettes. Gennemgå valget nedenfor og fjern de
              bestillinger, der tilhører en anden kunde.
            </p>
            <div className="dialog-list">
              {mismatchOrders.map((order) => (
                <div key={order.id} className="dialog-list-item">
                  <strong>{order.customerName}</strong>
                  <p>
                    {order.locationLabel} · {order.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
