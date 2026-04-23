"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinPending, setSigninPending] = useState(false);

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPending, setSignupPending] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Supabase no configurado todavía en este entorno.");
      return;
    }
    setSigninPending(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: signinEmail.trim(),
        password: signinPassword,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setSigninPending(false);
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Supabase no configurado todavía en este entorno.");
      return;
    }
    if (signupPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSignupPending(true);
    try {
      const supabase = getBrowserSupabase();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://academic-os-mu.vercel.app";
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: `${appUrl}/auth/confirm`,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }
      toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
      setMode("signin");
      setSigninEmail(signupEmail.trim());
    } finally {
      setSignupPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="flex items-center justify-center">
        <Logo size="lg" />
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-xl">Academic OS</CardTitle>
          <CardDescription>Entra con tu correo y contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={(e) => void handleSignIn(e)} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signin-email">Correo</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signin-password">Contraseña</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    value={signinPassword}
                    onChange={(e) => setSigninPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={signinPending} className="w-full">
                  {signinPending ? "Entrando…" : "Entrar"}
                </Button>
                <Link
                  href="/forgot-password"
                  className="text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  ¿Has olvidado la contraseña?
                </Link>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={(e) => void handleSignUp(e)} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signup-email">Correo</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  <span className="text-xs text-muted-foreground">Mínimo 8 caracteres.</span>
                </div>
                <Button type="submit" disabled={signupPending} className="w-full">
                  {signupPending ? "Creando…" : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Al continuar aceptas los términos de uso y la política de privacidad de Academic OS.
      </p>
    </main>
  );
}
