export interface MockOrderNote {
  id: string;
  requestId: string;
  author: string;
  note: string;
  createdAt: string;
}

export const mockOrderNotes: MockOrderNote[] = [
  {
    id: "note-1",
    requestId: "req-2026-031",
    author: "System",
    note: "Ordre importeret fra Jotform med 4 linjer.",
    createdAt: "2026-03-24 09:12",
  },
  {
    id: "note-2",
    requestId: "req-2026-031",
    author: "Jonatan",
    note: "Afventer afklaring på varenummer TR-99881.",
    createdAt: "2026-03-24 10:04",
  },
  {
    id: "note-3",
    requestId: "req-2026-032",
    author: "System",
    note: "Alle tre varelinjer blev matchet uden fejl.",
    createdAt: "2026-03-24 10:09",
  },
];
