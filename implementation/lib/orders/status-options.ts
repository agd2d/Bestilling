export const orderStatusOptions = [
  "created",
  "sent_to_supplier",
  "supplier_confirmed",
  "partially_delivered",
  "delivered",
  "cancelled",
] as const;

export type OrderStatusValue = (typeof orderStatusOptions)[number];

export function formatOrderStatus(status: string) {
  switch (status) {
    case "created":
      return "Oprettet";
    case "sent_to_supplier":
      return "Afsendt";
    case "supplier_confirmed":
      return "Godkendt af leverandør";
    case "partially_delivered":
      return "Delvist leveret";
    case "delivered":
      return "Leveret";
    case "cancelled":
      return "Annulleret";
    default:
      return status;
  }
}
