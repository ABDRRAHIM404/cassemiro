export const QUOTES_PAGE_SIZE = 25;

export function quotePageNumber(value?: string) {
  const page = Number(value);
  return value && Number.isSafeInteger(page) && page > 0 && page <= 100_000 ? page : 1;
}

export function quotePageHref(page: number, status: string, search: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("busca", search);
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return `/admin/orcamentos${query ? `?${query}` : ""}`;
}
