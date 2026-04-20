import { GraduationCap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <GraduationCap className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Academic OS</h1>
        <p className="text-lg text-muted-foreground">Soon.</p>
      </div>
    </main>
  );
}
