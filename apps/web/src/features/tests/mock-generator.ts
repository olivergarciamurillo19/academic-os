import type { MockSubject } from "@/features/subjects/mock-data";

import type { Question, TestConfig } from "./types";

function randId(i: number): string {
  return `q-${i}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateMockQuestions(subject: MockSubject, config: TestConfig): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < config.count; i += 1) {
    if (config.type === "multiple-choice") {
      out.push({
        id: randId(i),
        type: "multiple-choice",
        prompt: `[${subject.shortName}] Pregunta ${i + 1} sobre ${config.topic || "el temario"}.`,
        options: [
          "Opción A — definición correcta del concepto clave.",
          "Opción B — variante parcialmente correcta.",
          "Opción C — error común.",
          "Opción D — distractor obvio.",
        ],
        correctIndex: 0,
        explanation: `La respuesta correcta es A porque coincide con lo definido en los apuntes del tema ${i + 1}. Las otras opciones tienen errores comunes (confundir conceptos, aplicar fórmulas mal).`,
        sourceChunk: {
          resourceName: `Apuntes ${subject.shortName} — Tema ${i + 1}.pdf`,
          page: i + 3,
          excerpt:
            "Fragmento extraído del PDF fuente que respalda la respuesta correcta. Cuando la ingestion esté activa este texto vendrá del retriever.",
          resourceHref: `/subjects/${subject.id}`,
        },
      });
    } else if (config.type === "true-false") {
      out.push({
        id: randId(i),
        type: "true-false",
        prompt: `Afirmación ${i + 1}: la definición canónica del concepto ${i + 1} es correcta tal y como aparece en los apuntes.`,
        options: ["Falso", "Verdadero"],
        correctIndex: 1,
        explanation: "La afirmación es verdadera; consulta los apuntes del tema para ver por qué.",
        sourceChunk: {
          resourceName: `Apuntes ${subject.shortName} — Tema ${i + 1}.pdf`,
          page: i + 2,
          excerpt: "Párrafo que respalda la afirmación verdadera.",
          resourceHref: `/subjects/${subject.id}`,
        },
      });
    } else {
      out.push({
        id: randId(i),
        type: "short-answer",
        prompt: `Explica brevemente el concepto ${i + 1} del bloque ${config.topic || "temario"}.`,
        correctText: `Concepto ${i + 1}: definición canónica tal y como aparece en los apuntes.`,
        explanation:
          "Se considera correcta cualquier respuesta que capture la idea central de la definición; se valoran sinónimos y variantes.",
        sourceChunk: {
          resourceName: `Apuntes ${subject.shortName} — Tema ${i + 1}.pdf`,
          page: i + 1,
          excerpt: "Definición canónica del concepto.",
          resourceHref: `/subjects/${subject.id}`,
        },
      });
    }
  }
  return out;
}
