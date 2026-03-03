/**
 * 年月・第○週形式の週ユーティリティ
 * 例: 2026年1月第1週、2026年2月第2週
 */

/** 日付から週キーを取得（例: "2026-01-1" = 2026年1月第1週） */
export function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekOfMonth = Math.ceil(day / 7);
  return `${year}-${String(month).padStart(2, "0")}-${weekOfMonth}`;
}

/** 週キーから表示ラベル（例: "2026年1月 第1週"） */
export function getWeekLabel(weekKey: string): string {
  const parts = weekKey.split("-");
  const year = parts[0] ?? "";
  const month = parseInt(parts[1] ?? "1", 10);
  const weekNum = parseInt(parts[2] ?? "1", 10);
  return `${year}年${month}月 第${weekNum}週`;
}

/** 指定週の1週間前の週キーを取得 */
export function getPrevWeekKey(weekKey: string): string {
  const parts = weekKey.split("-");
  const year = parseInt(parts[0] ?? "0", 10);
  const month = parseInt(parts[1] ?? "1", 10);
  const weekOfMonth = parseInt(parts[2] ?? "1", 10);
  const dayInWeek = (weekOfMonth - 1) * 7 + 4;
  const d = new Date(year, month - 1, dayInWeek);
  d.setDate(d.getDate() - 7);
  return getWeekKey(d);
}

/** 直近 N 週の週キーリスト（新しい順） */
export function getRecentWeekKeys(count: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  let d = new Date();
  for (let i = 0; i < count * 2 && seen.size < count; i++) {
    const key = getWeekKey(d);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
    d.setDate(d.getDate() - 7);
  }
  return result;
}
