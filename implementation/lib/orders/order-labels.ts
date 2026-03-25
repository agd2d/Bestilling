export interface OrderLabelOption {
  id: string;
  name: string;
  color: string;
}

export const defaultOrderLabels: OrderLabelOption[] = [
  { id: "label-haste", name: "haste", color: "red" },
  { id: "label-restordre", name: "restordre", color: "amber" },
  { id: "label-afventer-afklaring", name: "afventer afklaring", color: "slate" },
  { id: "label-kunde-kontaktet", name: "kunde kontaktet", color: "blue" },
  { id: "label-klar-til-bestilling", name: "klar til bestilling", color: "green" },
];

export function getLabelTone(labelName: string, labelColor?: string) {
  const normalizedColor = (labelColor ?? "").toLowerCase();
  const normalizedName = labelName.toLowerCase();

  if (normalizedColor === "red" || normalizedName.includes("haste")) return "danger";
  if (normalizedColor === "amber" || normalizedName.includes("restordre")) return "warning";
  if (normalizedColor === "green" || normalizedName.includes("klar")) return "success";
  if (normalizedColor === "blue") return "info";
  return "neutral";
}
