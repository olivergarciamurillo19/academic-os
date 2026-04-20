"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function sendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed.length === 0) return;
    if (!isSupabaseConfigured()) {
      toast.error("Supabase no configurado todavía en este entorno.");
      return;
    }
    setPending(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Te he enviado un enlace de acceso. Revisa tu correo.");
    } finally {
      setPending(false);
    }
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured()) {
      toast.error("Supabase no configurado todavía en este entorno.");
      return;
    }
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined,
      },
    });
    if (error) toast.error(error.message);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="flex items-center justify-center">
        <Logo size="lg" />
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-xl">Entra en Academic OS</CardTitle>
          <CardDescription>
            Te enviamos un enlace mágico por email. Sin contraseñas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={(e) => void sendMagicLink(e)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              {pending ? "Enviando…" : "Enviar enlace mágico"}
            </Button>
          </form>

          <div className="relative my-1 text-center text-xs text-muted-foreground">
            <span className="bg-card px-2">o</span>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border"
            />
          </div>

          <Button variant="outline" className="w-full" onClick={() => void signInWithGoogle()}>
            Continuar con Google
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Al continuar aceptas los términos de uso y la política de privacidad de Academic OS.
      </p>
    </main>
  );
}
