export function sortAccounts(accounts: any[], by: "phone" | "health" | "created" = "created") {
  return [...accounts].sort((a, b) => {
    if (by === "phone") return String(a.phone).localeCompare(String(b.phone));
    if (by === "health") return String(a.health).localeCompare(String(b.health));
    return String(b.id).localeCompare(String(a.id));
  });
}
export function filterAccounts(accounts: any[], q: string) {
  if (!q) return accounts;
  const s = q.toLowerCase();
  return accounts.filter(a =>
    String(a.phone).toLowerCase().includes(s) ||
    String(a.id).toLowerCase().includes(s)
  );
}
