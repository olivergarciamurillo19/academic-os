import {
  BookOpen,
  Calendar,
  CheckSquare,
  House,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

export interface NavItem {
  key: string;
  label: string;
  href: Route;
  icon: LucideIcon;
  /** Show in bottom nav on mobile. */
  mobile?: boolean;
  /** Pin to the bottom of the left rail. */
  bottom?: boolean;
}

export const navItems: readonly NavItem[] = [
  { key: "home", label: "Inicio", href: "/dashboard", icon: House, mobile: true },
  {
    key: "subjects",
    label: "Asignaturas",
    href: "/subjects",
    icon: BookOpen,
    mobile: true,
  },
  {
    key: "calendar",
    label: "Calendario",
    href: "/calendar",
    icon: Calendar,
    mobile: true,
  },
  { key: "tasks", label: "Tareas", href: "/tasks", icon: CheckSquare, mobile: true },
  { key: "settings", label: "Ajustes", href: "/settings", icon: Settings, bottom: true },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
