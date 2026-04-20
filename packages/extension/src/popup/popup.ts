import type { StoredState } from "../types.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function getState(): Promise<StoredState> {
  return (await chrome.storage.local.get([
    "jwt",
    "apiBase",
    "lastSyncAt",
    "lastError",
  ])) as StoredState;
}

function render(state: StoredState) {
  const status = $("status");
  if (state.jwt) {
    status.textContent = "conectado";
    status.className = "status ok";
  } else {
    status.textContent = "desconectado";
    status.className = "status off";
  }
  $("last-sync").textContent = state.lastSyncAt
    ? new Date(state.lastSyncAt).toLocaleString()
    : "—";
  $("error").textContent = state.lastError ?? "";
}

async function refresh() {
  render(await getState());
}

$("save-jwt").addEventListener("click", async () => {
  const jwt = ($("jwt") as HTMLInputElement).value.trim();
  if (!jwt) return;
  chrome.runtime.sendMessage({ type: "SET_JWT", jwt });
  ($("jwt") as HTMLInputElement).value = "";
  await refresh();
});

$("sync").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  // Ask the active tab (if it's Aula Virtual) to re-run its snapshot.
  chrome.tabs.sendMessage(tab.id, { type: "FORCE_SYNC" }, () => {
    void chrome.runtime.lastError; // ignore if not an Aula Virtual tab
  });
  await refresh();
});

refresh();
