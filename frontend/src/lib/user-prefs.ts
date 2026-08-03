const PREFS_KEY = "archiflow-user-prefs";

export type UserPrefs = {
  showImportFab: boolean;
  confirmBeforeDelete: boolean;
};

const DEFAULTS: UserPrefs = {
  showImportFab: true,
  confirmBeforeDelete: true,
};

export function readUserPrefs(): UserPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<UserPrefs>) : {};
    return {
      showImportFab: parsed.showImportFab ?? DEFAULTS.showImportFab,
      confirmBeforeDelete: parsed.confirmBeforeDelete ?? DEFAULTS.confirmBeforeDelete,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeUserPrefs(prefs: UserPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event("archiflow-prefs"));
}
