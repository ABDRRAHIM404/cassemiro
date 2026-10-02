export function visibleServiceTitles<T extends { services: { title: string; is_visible: boolean } | null }>(links: T[]) {
  return links.flatMap((link) => link.services?.is_visible ? [link.services.title] : []);
}

export function publishedLinkedProjects<T extends { projects: { is_published: boolean } | null }>(links: T[]) {
  return links.map((link) => link.projects)
    .filter((project): project is NonNullable<T["projects"]> => Boolean(project?.is_published));
}
