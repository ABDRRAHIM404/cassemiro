export const PRIVATE_PROJECT_MEDIA_BUCKET = "project-media-private";

export function projectMediaUrl(id: string): string {
  return `/api/project-media/${id}`;
}
