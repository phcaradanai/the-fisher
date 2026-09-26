/**
 * Resolves a public asset path against Vite's BASE_URL so that assets load
 * correctly whether hosted at domain root, local dev, or a subdirectory (e.g. GitHub Pages).
 */
export function assetUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}
