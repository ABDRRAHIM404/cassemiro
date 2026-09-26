import Link from "next/link";

export default function NotFound() {
  return <main id="conteudo" className="not-found"><span>404</span><h1>Página não encontrada.</h1><p>Este caminho ainda não faz parte da obra.</p><Link href="/" className="button button--bronze">Voltar ao início</Link></main>;
}
