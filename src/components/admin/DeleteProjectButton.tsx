"use client";

import { deleteProject } from "@/app/admin/(protected)/projetos/actions";

export function DeleteProjectButton({ projectId, title }: { projectId: string; title: string }) {
  return (
    <form action={deleteProject.bind(null, projectId)} onSubmit={(event) => {
      if (!window.confirm(`Excluir “${title}” e todos os seus arquivos? Esta ação não pode ser desfeita.`)) event.preventDefault();
    }}>
      <button className="admin-danger-button" type="submit">Excluir projeto</button>
    </form>
  );
}
