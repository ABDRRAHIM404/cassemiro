"use client";

import { deleteTestimonial } from "@/app/admin/(protected)/depoimentos/actions";

export function DeleteTestimonialButton({ id, name }: { id: string; name: string }) {
  return <form action={deleteTestimonial.bind(null, id)} onSubmit={(event) => { if (!window.confirm(`Excluir o depoimento de ${name}?`)) event.preventDefault(); }}><button className="admin-danger-button" type="submit">Excluir depoimento</button></form>;
}
