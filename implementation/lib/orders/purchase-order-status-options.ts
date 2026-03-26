export const purchaseOrderStatusOptions = [
  "sent",
  "ready_to_send",
  "partially_delivered",
] as const;

export type PurchaseOrderStatusValue = (typeof purchaseOrderStatusOptions)[number];

export function formatPurchaseOrderStatus(status: string) {
  switch (status) {
    case "draft":
      return "Åben ordre";
    case "sent":
      return "Ordre afgivet";
    case "ready_to_send":
      return "Bekræftet af leverandør";
    case "partially_delivered":
      return "Modtaget ved kunde";
    case "completed":
      return "Fakturering til kunde";
    case "cancelled":
      return "Annulleret";
    default:
      return status;
  }
}

export function purchaseOrderStatusTone(status: string) {
  switch (status) {
    case "draft":
      return "warning";
    case "sent":
      return "info";
    case "ready_to_send":
      return "warning";
    case "partially_delivered":
      return "success";
    case "completed":
      return "neutral";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}
