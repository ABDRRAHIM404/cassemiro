type PublicQueryResult<T> = {
  data: T;
  error: { message: string } | null;
};

// A failed CMS read must not be rendered (or prerendered) as genuinely empty content.
export function requirePublicData<T>(result: PublicQueryResult<T>, source: string): T {
  if (result.error) {
    throw new Error(`Public content unavailable (${source}): ${result.error.message}`);
  }
  return result.data;
}
