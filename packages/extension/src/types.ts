export type BlackboardAnnouncement = {
  sourceId: string;
  title: string;
  description: string;
  subject: string;
  postedAt: string; // ISO
};

export type BlackboardTask = {
  sourceId: string;
  title: string;
  subject: string;
  dueAt: string | null; // ISO
  points: number | null;
  description?: string;
};

export type BlackboardMaterial = {
  sourceId: string;
  title: string;
  subject: string;
  url: string;
  kind: "pdf" | "link" | "video" | "other";
};

export type SyncPayload = {
  announcements: BlackboardAnnouncement[];
  tasks: BlackboardTask[];
  materials: BlackboardMaterial[];
  capturedAt: string; // ISO
};

export type SyncResponse = {
  ok: boolean;
  inserted: { announcements: number; tasks: number; materials: number };
  errors?: string[];
};

export type StoredState = {
  jwt?: string;
  apiBase?: string; // defaults to https://academic-os-mu.vercel.app
  lastSyncAt?: string;
  lastSnapshot?: SyncPayload;
  lastError?: string;
};
