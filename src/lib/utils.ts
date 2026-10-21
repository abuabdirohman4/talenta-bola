import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Link wa.me: dengan nomor → chat ke nomor itu; tanpa nomor → pilih kontak sendiri. */
export function waLink(text: string, phone?: string | null) {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}
