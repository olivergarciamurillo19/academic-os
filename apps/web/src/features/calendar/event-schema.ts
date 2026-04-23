import { z } from "zod";

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, { message: "Pon un título." }),
    subjectId: z.string().optional(),
    type: z.enum(["class", "exam", "deadline", "reminder", "other"]),
    source: z.enum(["manual", "ical", "google", "blackboard"]),
    startDate: z.string().min(1, { message: "Fecha de inicio requerida." }),
    startTime: z.string().min(1, { message: "Hora de inicio requerida." }),
    endDate: z.string().min(1, { message: "Fecha de fin requerida." }),
    endTime: z.string().min(1, { message: "Hora de fin requerida." }),
    location: z.string().optional(),
    description: z.string().optional(),
  })
  .refine(
    (v) => {
      const start = new Date(`${v.startDate}T${v.startTime}`);
      const end = new Date(`${v.endDate}T${v.endTime}`);
      return end.getTime() >= start.getTime();
    },
    { message: "El fin tiene que ser igual o posterior al inicio.", path: ["endTime"] },
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;
