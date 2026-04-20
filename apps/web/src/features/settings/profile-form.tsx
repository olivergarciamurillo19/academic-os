"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateProfile } from "./profile-actions";

interface ProfileFormProps {
  initialFullName: string;
  email: string;
}

export function ProfileForm({ initialFullName, email }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (trimmed.length === 0) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    startTransition(async () => {
      const res = await updateProfile({ fullName: trimmed });
      if (res.ok) {
        toast.success("Perfil actualizado");
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos personales</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              Para cambiar tu email, contacta con soporte.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
