export function projectServiceLinkChanges(current: string[], requested: string[]) {
  const currentSet = new Set(current);
  const requestedSet = new Set(requested);
  return {
    added: [...requestedSet].filter((id) => !currentSet.has(id)),
    removed: [...currentSet].filter((id) => !requestedSet.has(id))
  };
}
