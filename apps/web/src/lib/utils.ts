export function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatCFA(amount: number): string {
  // e.g., 4280000 -> "4 280 000 F"
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " F";
}

export function formatDate(date: Date): string {
  // e.g., 8 septembre 2026
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return formatter.format(date);
}
