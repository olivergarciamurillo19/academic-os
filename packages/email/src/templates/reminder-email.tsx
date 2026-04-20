import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Link,
  Hr,
  Preview,
} from "@react-email/components";
import * as React from "react";

interface ReminderEmailProps {
  taskTitle: string;
  dueAt: Date;
  taskUrl: string;
}

export function ReminderEmail({ taskTitle, dueAt, taskUrl }: ReminderEmailProps) {
  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dueAt);

  const subject = `Recordatorio: ${taskTitle} vence mañana`;

  return (
    <Html lang="es">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Recordatorio de tarea</Heading>
          <Hr style={hrStyle} />
          <Text style={labelStyle}>Tarea</Text>
          <Text style={taskTitleStyle}>{taskTitle}</Text>
          <Text style={labelStyle}>Fecha de entrega</Text>
          <Text style={dateStyle}>{formattedDate}</Text>
          <Hr style={hrStyle} />
          <Link href={taskUrl} style={linkStyle}>
            Ver tarea →
          </Link>
          <Text style={footerStyle}>
            Este recordatorio fue enviado automáticamente por Academic OS.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

ReminderEmail.subject = (taskTitle: string) =>
  `Recordatorio: ${taskTitle} vence mañana`;

// ─── Styles ──────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  maxWidth: "520px",
  margin: "0 auto",
  padding: "40px 32px",
};

const headingStyle: React.CSSProperties = {
  color: "#111827",
  fontSize: "20px",
  fontWeight: 600,
  margin: "0 0 16px",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
};

const labelStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
  textTransform: "uppercase",
};

const taskTitleStyle: React.CSSProperties = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: 600,
  margin: "0 0 16px",
};

const dateStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  margin: "0 0 16px",
};

const linkStyle: React.CSSProperties = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 500,
  padding: "10px 20px",
  textDecoration: "none",
};

const footerStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  marginTop: "32px",
};
