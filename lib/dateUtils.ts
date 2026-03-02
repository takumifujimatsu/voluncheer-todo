/** Firestore Timestamp を「更新日時」表示用にフォーマット */
export function formatUpdatedAt(ts: unknown): string {
  if (!ts) return "";
  try {
    const date = (ts as { toDate?: () => Date }).toDate?.() ?? (ts as Date);
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "今日更新";
    if (diffDays === 1) return "昨日更新";
    if (diffDays < 7) return `${diffDays}日前`;
    return `${d.getMonth() + 1}/${d.getDate()}更新`;
  } catch {
    return "";
  }
}
