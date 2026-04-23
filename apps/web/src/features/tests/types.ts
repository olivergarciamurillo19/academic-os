export type QuestionType = "multiple-choice" | "true-false" | "short-answer";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionCount = 5 | 10 | 15 | 20;

export interface TestConfig {
  topic: string;
  count: QuestionCount;
  difficulty: Difficulty;
  type: QuestionType;
}

export interface Question {
  id: string;
  prompt: string;
  type: QuestionType;
  /** For MC. */
  options?: readonly string[];
  /** Index into options, or 0/1 for TF (1 = true), or a reference answer for short. */
  correctIndex?: number;
  correctText?: string;
  explanation: string;
  sourceChunk: {
    resourceName: string;
    page?: number;
    excerpt: string;
    resourceHref?: string;
  };
}

export interface Answer {
  questionId: string;
  optionIndex?: number;
  text?: string;
  /** Graded at runtime — derived from comparing to `Question`. */
  correct: boolean;
}

export interface TestResult {
  config: TestConfig;
  questions: readonly Question[];
  answers: readonly Answer[];
  correctCount: number;
  durationSeconds: number;
}

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
};

export const questionTypeLabels: Record<QuestionType, string> = {
  "multiple-choice": "Opción múltiple",
  "true-false": "Verdadero / Falso",
  "short-answer": "Respuesta corta",
};
