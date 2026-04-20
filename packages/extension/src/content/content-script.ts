import type {
  BlackboardAnnouncement,
  BlackboardMaterial,
  BlackboardTask,
  SyncPayload,
} from "../types.js";

const DEFAULT_SUBJECT = "desconocida";

function textOf(el: Element | null): string {
  return el?.textContent?.trim() ?? "";
}

function parseDate(raw: string): string | null {
  // Aula Virtual uses DD/MM/YYYY or DD/MM/YYYY HH:mm
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, hh = "00", mm = "00"] = m;
  const iso = `${y}-${mo}-${d}T${hh}:${mm}:00`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function detectSubject(): string {
  const breadcrumb = document.querySelector<HTMLElement>(
    "[id^='breadcrumb'] a, .breadcrumb a",
  );
  return textOf(breadcrumb) || DEFAULT_SUBJECT;
}

function extractAnnouncements(): BlackboardAnnouncement[] {
  const subject = detectSubject();
  const items: BlackboardAnnouncement[] = [];
  // Blackboard renders announcements inside li.announcement or div.details
  const nodes = document.querySelectorAll<HTMLElement>(
    ".announcement, li[id^='announcement_'], .details",
  );
  nodes.forEach((node) => {
    const title = textOf(node.querySelector("h3, h4, .title, a"));
    if (!title) return;
    const description = textOf(node.querySelector(".vtbegenerated, .detail, p"));
    const dateRaw = textOf(node.querySelector(".metadata, .posted, time"));
    const postedAt = parseDate(dateRaw) ?? new Date().toISOString();
    const sourceId = node.id || `${title}-${postedAt}`;
    items.push({ sourceId, title, description, subject, postedAt });
  });
  return items;
}

function extractTasks(): BlackboardTask[] {
  const subject = detectSubject();
  const items: BlackboardTask[] = [];
  // Blackboard assignments are inside .liItem with links to /bbcswebdav/... or /webapps/assignment
  const nodes = document.querySelectorAll<HTMLElement>(
    "li.liItem, tr[id^='assignment_'], .assignment",
  );
  nodes.forEach((node) => {
    const title = textOf(node.querySelector("a, .title, h3"));
    if (!title) return;
    const isAssignment =
      /entrega|tarea|assignment|examen|cuestionario/i.test(
        textOf(node.querySelector(".metadata")) + " " + title,
      );
    if (!isAssignment) return;

    const dueRaw = textOf(node.querySelector(".dueDate, .deadline, time"));
    const pointsRaw = textOf(node.querySelector(".points, .score"));
    const points =
      pointsRaw.match(/(\d+(?:[.,]\d+)?)/)?.[1]?.replace(",", ".") ?? null;

    items.push({
      sourceId: node.id || title,
      title,
      subject,
      dueAt: parseDate(dueRaw),
      points: points ? Number(points) : null,
    });
  });
  return items;
}

function extractMaterials(): BlackboardMaterial[] {
  const subject = detectSubject();
  const items: BlackboardMaterial[] = [];
  document
    .querySelectorAll<HTMLAnchorElement>("a[href*='bbcswebdav'], a[href$='.pdf']")
    .forEach((a) => {
      const title = textOf(a);
      if (!title) return;
      const url = new URL(a.href, location.href).toString();
      const kind: BlackboardMaterial["kind"] = /\.pdf$/i.test(url)
        ? "pdf"
        : /youtube|vimeo/i.test(url)
          ? "video"
          : "link";
      items.push({
        sourceId: url,
        title,
        subject,
        url,
        kind,
      });
    });
  return items;
}

function currentSnapshot(): SyncPayload {
  return {
    announcements: extractAnnouncements(),
    tasks: extractTasks(),
    materials: extractMaterials(),
    capturedAt: new Date().toISOString(),
  };
}

function hasChanges(prev: SyncPayload | undefined, next: SyncPayload): boolean {
  if (!prev) return true;
  const prevIds = new Set([
    ...prev.announcements.map((a) => a.sourceId),
    ...prev.tasks.map((t) => t.sourceId),
    ...prev.materials.map((m) => m.sourceId),
  ]);
  const nextIds = [
    ...next.announcements.map((a) => a.sourceId),
    ...next.tasks.map((t) => t.sourceId),
    ...next.materials.map((m) => m.sourceId),
  ];
  return nextIds.some((id) => !prevIds.has(id));
}

async function run() {
  const snapshot = currentSnapshot();
  if (
    snapshot.announcements.length +
      snapshot.tasks.length +
      snapshot.materials.length ===
    0
  ) {
    return;
  }

  const { lastSnapshot } = (await chrome.storage.local.get("lastSnapshot")) as {
    lastSnapshot?: SyncPayload;
  };

  if (!hasChanges(lastSnapshot, snapshot)) return;

  chrome.runtime.sendMessage({ type: "SYNC_PAYLOAD", payload: snapshot });
}

// Run once on idle + observe SPA-style navigations.
run();
let last = location.href;
new MutationObserver(() => {
  if (location.href !== last) {
    last = location.href;
    setTimeout(run, 1500);
  }
}).observe(document, { subtree: true, childList: true });
