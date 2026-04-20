import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SubjectNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Asignatura no encontrada</h1>
      <p className="text-sm text-muted-foreground">
        No encontramos esa asignatura en tu matrícula. Revisa la URL o vuelve al listado.
      </p>
      <Button asChild>
        <Link href={{ pathname: "/subjects" }}>Ver todas las asignaturas</Link>
      </Button>
    </div>
  );
}
