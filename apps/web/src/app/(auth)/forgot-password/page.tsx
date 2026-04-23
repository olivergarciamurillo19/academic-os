"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Supabase no configurado todavía en este entorno.");
      return;
    }
    setPending(true);
    try {
      const supabase = getBrowserSupabase();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://academic-os-mu.vercel.app";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appUrl}/auth/confirm?next=/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="flex items-center justify-center">
        <Logo size="lg" />
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Te enviamos un enlace para que puedas establecer una contraseña nueva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Si ese correo tiene cuenta, recibirás un enlace en unos segundos. Revisa también la
              carpeta de spam.
            </p>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
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
                {pending ? "Enviando…" : "Enviar enlace"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Link
        href="/login"
        className="text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Volver a iniciar sesión
      </Link>
    </main>
  );
}
