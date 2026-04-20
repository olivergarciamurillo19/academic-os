import type { StoredState, SyncPayload, SyncResponse } from "../types.js";

const DEFAULT_API_BASE = "https://academic-os-mu.vercel.app";
const SYNC_PATH = "/api/sync/blackboard";

async function getState(): Promise<StoredState> {
  const data = (await chrome.storage.local.get([
    "jwt",
    "apiBase",
    "lastSyncAt",
    "lastSnapshot",
    "lastError",
  ])) as StoredState;
  return data;
}

async function setState(partial: Partial<StoredState>) {
  await chrome.storage.local.set(partial);
}

async function postSync(payload: SyncPayload): Promise<SyncResponse> {
  const { jwt, apiBase } = await getState();
  if (!jwt) throw new Error("No hay JWT guardado. Inicia sesión en Academic OS y pega el token.");
  const url = `${apiBase ?? DEFAULT_API_BASE}${SYNC_PATH}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Sync falló ${resp.status}: ${body.slice(0, 200)}`);
  }
  return (await resp.json()) as SyncResponse;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "SYNC_PAYLOAD") return;
  (async () => {
    try {
      const payload = msg.payload as SyncPayload;
      const result = await postSync(payload);
      await setState({
        lastSnapshot: payload,
        lastSyncAt: new Date().toISOString(),
        lastError: undefined,
      });
      sendResponse({ ok: true, result });

      const total =
        result.inserted.announcements +
        result.inserted.tasks +
        result.inserted.materials;
      if (total > 0) {
        chrome.action.setBadgeText({ text: String(total) });
        chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await setState({ lastError: message });
      sendResponse({ ok: false, error: message });
    }
  })();
  return true; // async response
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "SET_JWT") return;
  (async () => {
    await setState({ jwt: msg.jwt as string });
    sendResponse({ ok: true });
  })();
  return true;
});
