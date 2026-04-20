import type { Citation } from "./types";

/**
 * Generate a deterministic-looking mock assistant response for any user prompt.
 * Replaced by /api/ai/chat streaming once Armando lands the backend.
 */
export function mockAnswer(subjectName: string): {
  content: string;
  citations: Citation[];
} {
  const content = `Vamos con **${subjectName}**.

Esto es una respuesta de ejemplo mientras el backend todavía no está conectado, pero ya puedes:

1. Ver el **streaming** letra a letra (como cuando hable Claude Sonnet 4.5 de verdad).
2. Usar citas inline como [1] y [2] que son clickeables.
3. Renderizar Markdown — **negrita**, _cursiva_, listas, \`código inline\`.

Cuando el endpoint \`/api/ai/chat\` esté arriba, esta burbuja se rellenará con
la respuesta real del LLM, con RAG sobre tus PDFs.`;

  const citations: Citation[] = [
    {
      id: 1,
      resourceName: "Apuntes tema 1.pdf",
      page: 3,
      resourceHref: "/subjects/44101301/resources/tema-1",
    },
    {
      id: 2,
      resourceName: "Problemas resueltos.pdf",
      page: 7,
      resourceHref: "/subjects/44101301/resources/problemas",
    },
  ];
  return { content, citations };
}
