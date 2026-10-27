const allowedQueryParameters = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
]);

export function buildGaPageUrl(origin: string, pathname: string, search: string) {
  const allowedParameters = new URLSearchParams();

  for (const [key, value] of new URLSearchParams(search)) {
    if (allowedQueryParameters.has(key)) {
      allowedParameters.append(key, value);
    }
  }

  const query = allowedParameters.toString();
  const pagePath = `${pathname}${query ? `?${query}` : ""}`;

  return {
    pagePath,
    pageLocation: `${origin}${pagePath}`,
  };
}
