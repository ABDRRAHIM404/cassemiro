"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html lang="pt-BR"><body><main className="not-found"><span>ERRO INESPERADO</span><h1>Algo saiu do lugar.</h1><p>Nossa equipe poderá verificar o problema. Tente novamente em instantes.</p><button className="button button--bronze" type="button" onClick={reset}>Tentar novamente</button></main></body></html>;
}
