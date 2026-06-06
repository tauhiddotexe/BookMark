type CoverSource = {
  title: string;
  author?: string;
  google_books_id?: string;
  openlibrary_id?: string;
  isbn_13?: string;
  isbn_10?: string;
  cover_url?: string;
  thumbnail_url?: string;
};

function buildGoogleBooksCover(volumeId: string, zoom: number) {
  return `https://books.google.com/books/content?id=${encodeURIComponent(volumeId)}&printsec=frontcover&img=1&zoom=${zoom}&source=gbs_api`;
}

function normalizeGoogleImageUrl(url: string) {
  if (!url) return "";

  try {
    const parsed = new URL(url.replace("http://", "https://"));
    if (parsed.hostname.includes("google")) {
      parsed.protocol = "https:";
      parsed.searchParams.delete("edge");
    }
    return parsed.toString();
  } catch {
    return url.replace("http://", "https://");
  }
}

export function getBookCoverCandidates(source: CoverSource) {
  const candidates = [
    normalizeGoogleImageUrl(source.cover_url || ""),
    normalizeGoogleImageUrl(source.thumbnail_url || ""),
  ];

  if (source.isbn_13) candidates.push(`https://covers.openlibrary.org/b/isbn/${source.isbn_13}-L.jpg`);
  if (source.isbn_10) candidates.push(`https://covers.openlibrary.org/b/isbn/${source.isbn_10}-L.jpg`);
  if (source.openlibrary_id) candidates.push(`https://covers.openlibrary.org/b/olid/${source.openlibrary_id.replace("/works/", "")}-L.jpg`);
  
  if (source.google_books_id) {
    candidates.push(buildGoogleBooksCover(source.google_books_id, 1));
    candidates.push(buildGoogleBooksCover(source.google_books_id, 2));
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function getBookCoverPlaceholder(title: string, author = "") {
  const safeTitle = escapeXml(title || "Untitled");
  const safeAuthor = escapeXml(author || "Unknown author");
  const initials = escapeXml(
    (title || "Book")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "BK"
  );

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 630">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1a2a22" />
          <stop offset="100%" stop-color="#0b1310" />
        </linearGradient>
      </defs>
      <rect width="420" height="630" rx="32" fill="url(#bg)" />
      <rect x="28" y="28" width="364" height="574" rx="24" fill="none" stroke="rgba(255,255,255,0.14)" />
      <text x="48" y="120" fill="#39f0a0" font-size="26" font-family="Arial, sans-serif" letter-spacing="8">BOOKMARK</text>
      <text x="48" y="300" fill="#f6f7f2" font-size="116" font-weight="700" font-family="Arial, sans-serif">${initials}</text>
      <text x="48" y="390" fill="#f6f7f2" font-size="34" font-weight="700" font-family="Arial, sans-serif">${safeTitle}</text>
      <text x="48" y="440" fill="#98aca1" font-size="22" font-family="Arial, sans-serif">${safeAuthor}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
