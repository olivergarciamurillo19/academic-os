export interface Citation {
  id: number;
  resourceName: string;
  /** Page number (PDF) or section anchor. */
  page?: number;
  /** Path inside /subjects/[id]/resources/[resourceId] to open. */
  resourceHref?: string;
}

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAtISO: string;
  /** Assistant-only: citations referenced by [n] in content. */
  citations?: Citation[];
  /** True while being streamed. */
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  subjectId: string;
  title: string;
  createdAtISO: string;
  updatedAtISO: string;
  messages: ChatMessage[];
}
