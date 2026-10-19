export function getSafeRedirectPath(
  nextPath: string | null | undefined,
  origin: string
): string | null {
  if (!nextPath) return null;

  let decodedPath = nextPath;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (
      !decodedPath.startsWith("/") ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\") ||
      /[\s\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return null;
    }

    let canonicalPath: string;
    try {
      canonicalPath = decodeURIComponent(decodedPath);
    } catch {
      return null;
    }

    if (canonicalPath === decodedPath) break;
    decodedPath = canonicalPath;

    if (attempt === 7) return null;
  }

  try {
    const base = new URL(origin);
    const destination = new URL(decodedPath, base);
    if (destination.origin !== base.origin) return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}
