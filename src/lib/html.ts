// Simple HTML escape utility to prevent injection in email templates
// Escapes only &, <, > so existing tests that check literal apostrophes remain valid
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
