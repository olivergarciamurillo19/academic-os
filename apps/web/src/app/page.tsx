import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Academic<span className="text-primary">OS</span>
          </h1>
          <p className="text-lg text-muted-foreground">Soon.</p>
        </div>
        <SubjectPalettePreview />
      </section>
      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        Construido para la UAL · v0
      </footer>
    </main>
  );
}

function SubjectPalettePreview() {
  const subjects = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {subjects.map((n) => (
        <span
          key={n}
          className="inline-flex h-6 w-6 rounded-full ring-1 ring-border"
          style={{ backgroundColor: `var(--color-subject-${n})` }}
          aria-label={`Color de asignatura ${n}`}
          title={`subject-${n}`}
        />
      ))}
    </div>
  );
}
