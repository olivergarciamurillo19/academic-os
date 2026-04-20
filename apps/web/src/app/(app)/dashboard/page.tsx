import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import {
  BellRing,
  BookOpen,
  CalendarClock,
  CheckSquare,
  FileText,
  Flag,
  GraduationCap,
  MessageSquare,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  loadDashboardData,
  type CohortNotice,
  type ContinueStudying,
  type IndexedDocument,
  type PendingTask,
  type RecentConversation,
  type UpcomingEvent,
} from "@/features/dashboard/queries";

export const metadata: Metadata = {
  title: "Inicio",
};

const quickLinks = [
  {
    title: "Asignaturas",
    description: "Todo el material y recursos de tus asignaturas.",
    href: "/subjects" as const,
    icon: BookOpen,
  },
  {
    title: "Calendario",
    description: "Clases, exámenes y entregas.",
    href: "/calendar" as const,
    icon: CalendarClock,
  },
  {
    title: "Tareas",
    description: "Lo que tienes que hacer esta semana.",
    href: "/tasks" as const,
    icon: CheckSquare,
  },
];

function whenLabel(d: Date): string {
  if (isToday(d)) return `Hoy · ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Mañana · ${format(d, "HH:mm")}`;
  return format(d, "EEE d MMM · HH:mm", { locale: es });
}

function firstName(fullName: string | null | undefined, email: string | null | undefined): string {
  if (fullName && fullName.length > 0) return fullName.split(" ")[0] ?? fullName;
  if (email) return email.split("@")[0] ?? "allí";
  return "allí";
}

export default async function DashboardPage() {
  const [session, data] = await Promise.all([getSessionUser(), loadDashboardData()]);

  const displayName = firstName(
    (session?.user.user_metadata?.full_name as string | undefined) ?? null,
    session?.user.email ?? null,
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            Academic OS
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Hola, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {data.ready
            ? "Aquí tienes un resumen. Todo lo que necesitas, a un clic."
            : "Aquí verás tus próximos eventos y tareas cuando el backend tenga datos."}
        </p>
      </header>

      {data.continueStudying ? (
        <ContinueStudyingCard item={data.continueStudying} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <UpcomingEventsCard events={data.upcomingEvents} />
        <PendingTasksCard tasks={data.pendingTasks} />
        <RecentChatCard conversation={data.recentConversation} />
      </div>

      {(data.indexedDocuments.length > 0 || data.cohortNotices.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.indexedDocuments.length > 0 && (
            <IndexedDocumentsCard docs={data.indexedDocuments} />
          )}
          {data.cohortNotices.length > 0 && (
            <CohortNoticesCard notices={data.cohortNotices} />
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardHeader className="gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingEventsCard({ events }: { events: readonly UpcomingEvent[] }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CalendarClock className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">Próximos eventos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">
            Sin eventos próximos. Añade uno desde el calendario.
          </p>
        ) : (
          <ul className="divide-y">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 px-6 py-3 text-sm">
                <span className="font-medium">{e.title}</span>
                <span className="text-xs text-muted-foreground">
                  <time dateTime={e.startAt.toISOString()}>{whenLabel(e.startAt)}</time>
                  {e.subjectName ? ` · ${e.subjectName}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PendingTasksCard({ tasks }: { tasks: readonly PendingTask[] }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CheckSquare className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">Tareas pendientes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {tasks.length === 0 ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">Estás al día.</p>
        ) : (
          <ul className="divide-y">
            {tasks.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "flex items-center justify-between gap-2 px-6 py-3 text-sm",
                  t.status === "doing" && "bg-muted/40",
                )}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.subjectName ? `${t.subjectName} · ` : ""}
                    {t.dueAt
                      ? `Vence ${whenLabel(t.dueAt).toLowerCase()}`
                      : "Sin fecha"}
                  </span>
                </div>
                {t.priority > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                    <Flag className="h-3 w-3" />
                    Alta
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ContinueStudyingCard({ item }: { item: ContinueStudying }) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <PlayCircle className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">Continuar estudiando</CardTitle>
            <CardDescription>{item.subjectName}</CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={{ pathname: `/subjects/${item.subjectId}/chat` }}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-background"
          >
            <Sparkles className="h-3 w-3" />
            Sesión 25 min
          </Link>
          {item.lastResourceId ? (
            <Link
              href={{
                pathname: `/subjects/${item.subjectId}/resources/${item.lastResourceId}`,
              }}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-background"
            >
              <FileText className="h-3 w-3" />
              Último recurso
            </Link>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
}

function IndexedDocumentsCard({ docs }: { docs: readonly IndexedDocument[] }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">Documentos listos</CardTitle>
        <CardDescription>Indexados en las últimas 24h</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {docs.map((d) => (
            <li key={d.resourceId} className="px-6 py-3 text-sm">
              <Link
                href={{
                  pathname: `/subjects/${d.subjectId}/resources/${d.resourceId}`,
                }}
                className="flex flex-col gap-0.5 hover:underline"
              >
                <span className="font-medium">{d.title}</span>
                <span className="text-xs text-muted-foreground">
                  {d.subjectName ?? "Sin asignatura"} ·{" "}
                  <time dateTime={d.indexedAt.toISOString()}>
                    {format(d.indexedAt, "d MMM HH:mm", { locale: es })}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CohortNoticesCard({ notices }: { notices: readonly CohortNotice[] }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BellRing className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">Avisos de tu grupo</CardTitle>
        <CardDescription>Eventos oficiales de los próximos 7 días</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {notices.map((n) => (
            <li key={n.id} className="flex flex-col gap-0.5 px-6 py-3 text-sm">
              <span className="font-medium">{n.title}</span>
              <span className="text-xs text-muted-foreground">
                <time dateTime={n.startAt.toISOString()}>{whenLabel(n.startAt)}</time>
                {n.location ? ` · ${n.location}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RecentChatCard({
  conversation,
}: {
  conversation: RecentConversation | null;
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MessageSquare className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">Chat IA</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {conversation ? (
          <Link
            href={{ pathname: `/subjects/${conversation.subjectId}/chat` }}
            className="flex flex-col gap-1 hover:underline"
          >
            <span className="font-medium">{conversation.title}</span>
            <span className="text-xs text-muted-foreground">
              {conversation.subjectName ?? "Sin asignatura"} ·{" "}
              <time dateTime={conversation.updatedAt.toISOString()}>
                {format(conversation.updatedAt, "d MMM HH:mm", { locale: es })}
              </time>
            </span>
          </Link>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Sin conversaciones aún. Pregúntame sobre cualquier asignatura.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
