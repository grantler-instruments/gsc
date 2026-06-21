/** Web app URL for the experimental channel at the current or given Vite base. */
export function experimentalWebAppUrl(baseUrl: string = import.meta.env.BASE_URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  if (base.endsWith("/experimental/")) {
    return `${base}app/`;
  }
  return `${base}experimental/app/`;
}
