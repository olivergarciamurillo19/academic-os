"use client";

import { Camera } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateProfile, uploadAvatar } from "./profile-actions";

interface ProfileFormProps {
  initialFullName: string;
  email: string;
  initialAvatarUrl: string | null;
}

function initialsFor(name: string, email: string): string {
  const source = name.trim().length > 0 ? name : email;
  const parts = source.split(/\s+|@/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase() || "··";
}

export function ProfileForm({
  initialFullName,
  email,
  initialAvatarUrl,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadAvatar(fd);
    setUploading(false);
    if (res.ok) {
      setAvatarUrl(res.url);
      toast.success("Avatar actualizado");
    } else {
      toast.error(res.message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName || email} /> : null}
              <AvatarFallback>{initialsFor(fullName, email)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploading ? "Subiendo…" : "Cambiar avatar"}
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG o WebP · máx 5 MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => void onPickAvatar(e)}
            />
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
