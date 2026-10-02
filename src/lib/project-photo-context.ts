const verifiedProjects: Record<string, { cover: string; alt: string; photoCaption: string }> = {
  "residencia-contemporanea": {
    cover: "/api/project-media/18ad387e-cf0a-429b-8185-0202a5ccbe17",
    alt: "Fachada branca de residência contemporânea na etapa final da obra",
    photoCaption: "Registro da etapa final da obra"
  },
  "residencia-contemporanea-linear": {
    cover: "/api/project-media/df2b37c2-418b-4f3d-a3bc-49673d61dafa",
    alt: "Residência de linhas retas durante a construção, com materiais na fachada",
    photoCaption: "Registro da obra em execução"
  }
};

export function getVerifiedProjectContext(slug: string, cover: string | null) {
  const project = verifiedProjects[slug];
  if (!project) return null;
  return {
    status: "Obra concluída",
    photo: cover === project.cover ? { alt: project.alt, caption: project.photoCaption } : null
  };
}
