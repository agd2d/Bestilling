export const purchaseOrderStatusOptions = [
  "sent",
  "ready_to_send",
  "partially_delivered",
  "completed",
] as const;

export type PurchaseOrderStatusValue = (typeof purchaseOrderStatusOptions)[number];

export function formatPurchaseOrderStatus(status: string) {
  switch (status) {
    case "draft":
      return "Kladde";
    case "sent":
      return "Afsendt ordre";
    case "ready_to_send":
      return "Afventer bekræftelse fra leverandør";
    case "partially_delivered":
      return "Ordre modtaget ved kunden";
    case "completed":
      return "Sendt til fakturering";
    case "cancelled":
      return "Annulleret";
    default:
      return status;
  }
}

export function purchaseOrderStatusTone(status: string) {
  switch (status) {
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
