// Versioned localStorage saves. Cash, mission progress, collected stashes
// and the best wanted level carry over between sessions. Saves without a
// version stamp (none exist yet) are still readable.

const KEY = 'coral-bay-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || s === null) return null;
    return {
      cash: typeof s.cash === 'number' ? s.cash : 0,
      mission: typeof s.mission === 'number' ? s.mission : 0,
      stashes: Array.isArray(s.stashes) ? s.stashes : [],
      bestStars: typeof s.bestStars === 'number' ? s.bestStars : 0,
    };
  } catch (e) {
    return null;
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({
      v: 1,
      cash: save.cash,
      mission: save.mission,
      stashes: save.stashes,
      bestStars: save.bestStars,
    }));
  } catch (e) { /* storage may be unavailable; the game still runs */ }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch (e) { /* ignore */ }
}
