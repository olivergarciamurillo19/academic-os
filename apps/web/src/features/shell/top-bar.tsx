"use client";

import { LogOut, Search, Settings, User } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { NotificationsBell } from "./notifications-bell";

interface ShellUser {
  name: string;
  email: string;
  initials: string;
}

const mockUser: ShellUser = {
  name: "Óliver García",
  email: "oliver@ual.es",
  initials: "ÓG",
};

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Link href={{ pathname: "/dashboard" }} className="shrink-0">
          <Logo size="sm" />
        </Link>

        <div className="flex-1 md:max-w-md md:mx-auto">
          <SearchButton />
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <NotificationsBell />
          <ThemeToggle />
          <UserMenu user={mockUser} />
        </div>
      </div>
    </header>
  );
}

function SearchButton() {
  return (
    <button
      type="button"
      className="group inline-flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Buscar en Academic OS"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="flex-1 text-left">Buscar asignaturas, recursos, tareas…</span>
      <kbd className="hidden items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de usuario">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={{ pathname: "/settings" }}>
            <User className="mr-2 h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={{ pathname: "/settings" }}>
            <Settings className="mr-2 h-4 w-4" />
            Ajustes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
