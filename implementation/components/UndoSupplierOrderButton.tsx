"use client";

export default function UndoSupplierOrderButton({
  orderId,
}: {
  orderId: string;
}) {
  async function handleClick() {
    const confirmed = window.confirm(
      "Er du sikker på, at leverandørordren skal fortrydes og kundebestillingen sendes tilbage?"
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/orders/requests/${orderId}/undo-supplier-order`, {
      method: "POST",
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      window.alert(data.error ?? "Leverandørordren kunne ikke fortrydes.");
      return;
    }

    window.location.assign("/orders");
  }

  return (
    <button type="button" className="button secondary" onClick={() => void handleClick()}>
      Fortryd leverandørordre
    </button>
  );
}
