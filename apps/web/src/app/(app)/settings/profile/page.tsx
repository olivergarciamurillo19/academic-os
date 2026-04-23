import type { Metadata } from "next";

import { getProfile } from "@/features/settings/profile-actions";
import { ProfileForm } from "@/features/settings/profile-form";

export const metadata: Metadata = {
  title: "Perfil · Ajustes",
};

export default async function SettingsProfilePage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Cómo te ven los profesores y tus apuntes en Academic OS.
        </p>
      </header>
      <ProfileForm
        initialFullName={profile?.fullName ?? ""}
        email={profile?.email ?? ""}
        initialAvatarUrl={profile?.avatarUrl ?? null}
      />
    </div>
  );
}
