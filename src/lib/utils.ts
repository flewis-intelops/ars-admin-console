import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type StatusTone = "amber" | "green" | "red" | "orange" | "muted";

export function statusTone(status: string): StatusTone {
  switch (status) {
    case "active":
      return "green";
    case "pending_vetting":
      return "orange";
    case "cold":
      return "muted";
    case "terminated":
      return "red";
    default:
      return "amber";
  }
}
