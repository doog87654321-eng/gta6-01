// Progress saves to localStorage: cash, story progress, stashes found and
// the best wanted level reached. Nothing else leaves the machine.

const KEY = 'coral-bay-hot-streets-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return null;
    return {
      cash: Math.max(0, d.cash | 0),
      mission: Math.max(0, Math.min(6, d.mission | 0)),
      stashes: Math.max(0, d.stashes | 0),
      bestWanted: Math.max(0, Math.min(5, d.bestWanted | 0)),
    };
  } catch (e) { return null; }
}

export function storeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: data.cash | 0,
      mission: data.mission | 0,
      stashes: data.stashes | 0,
      bestWanted: data.bestWanted | 0,
    }));
  } catch (e) { /* storage is best-effort */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
