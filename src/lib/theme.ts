export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "classic-threads-theme";

export function resolveTheme(savedTheme: string | null, prefersDark: boolean): Theme {
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return prefersDark ? "dark" : "light";
}

export function getThemeBootstrapScript(): string {
  return `(() => { try { const saved = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); const theme = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch (_) {} })()`;
}
