import { clsx, type ClassValue } from"clsx"
import { twMerge } from"tailwind-merge"

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

export function formatDate(date: any): string {
 if (!date) return"—";
 try {
 if (typeof date ==="object" && date.seconds !== undefined) {
 const ms = Number(date.seconds) * 1000;
 if (isNaN(ms)) return"—";
 const d = new Date(ms);
 return isNaN(d.getTime()) ?"—" : d.toLocaleDateString();
 }
 if (date instanceof Date) {
 return isNaN(date.getTime()) ?"—" : date.toLocaleDateString();
 }
 const d = new Date(date);
 return isNaN(d.getTime()) ?"—" : d.toLocaleDateString();
 } catch (e) {
 return"—";
 }
}
