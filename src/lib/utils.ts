import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | undefined | null,
  currency: string = "BDT",
  symbol: string = "৳"
): string {
  const numericAmount = typeof amount === "number" ? amount : Number(amount) || 0;
  
  // Format with commas and standard two decimals or integer if clean
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  // Return like "৳ 125,000" or "$ 125,000"
  return `${symbol} ${formattedNumber}`;
}

export function formatDate(
  dateValue: string | Date | undefined | null,
  formatPattern: string = "dd MMM yyyy"
): string {
  if (!dateValue) return "N/A";
  try {
    const dateObj = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    if (!isValid(dateObj)) {
      const fallback = new Date(dateValue);
      if (!isValid(fallback)) return "N/A";
      return format(fallback, formatPattern);
    }
    return format(dateObj, formatPattern);
  } catch {
    return "N/A";
  }
}

export function generateId(prefix: string = ""): string {
  const randomStr = Math.random().toString(36).substring(2, 9);
  const timeStr = Date.now().toString(36);
  return prefix ? `${prefix}_${timeStr}${randomStr}` : `${timeStr}${randomStr}`;
}

export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}
