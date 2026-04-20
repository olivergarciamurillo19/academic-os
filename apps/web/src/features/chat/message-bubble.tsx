"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Children, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import type { ChatMessage } from "./types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const time = useMemo(() => {
    const d = new Date(message.createdAtISO);
    return format(d, "HH:mm", { locale: es });
  }, [message.createdAtISO]);

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm md:max-w-[75%]",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border bg-card",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <article className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p>{renderWithCitations(children, message)}</p>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </article>
        )}
        <div
          className={cn(
            "mt-1 flex items-center gap-2 text-[10px]",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          <time dateTime={message.createdAtISO}>{time}</time>
          {message.streaming && !isUser && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              escribiendo…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Replace `[n]` tokens in text nodes with clickable citation chips.
 */
function renderWithCitations(children: React.ReactNode, message: ChatMessage): React.ReactNode {
  const citations = message.citations ?? [];
  if (citations.length === 0) return children;
  const map = new Map(citations.map((c) => [c.id, c]));

  return Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const parts = child.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = /^\[(\d+)\]$/.exec(part);
      if (!match) return <span key={i}>{part}</span>;
      const n = Number.parseInt(match[1] ?? "0", 10);
      const cite = map.get(n);
      if (!cite) return <span key={i}>{part}</span>;
      return <CitationChip key={i} citation={cite} />;
    });
  });
}

function CitationChip({ citation }: { citation: NonNullable<ChatMessage["citations"]>[number] }) {
  const content = (
    <span className="ml-0.5 inline-flex items-center rounded-sm bg-primary/15 px-1 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/25">
      [{citation.id}]
    </span>
  );
  if (citation.resourceHref) {
    return (
      <Link
        href={{ pathname: citation.resourceHref }}
        title={`${citation.resourceName}${citation.page ? ` · p. ${citation.page}` : ""}`}
      >
        {content}
      </Link>
    );
  }
  return <span title={citation.resourceName}>{content}</span>;
}

