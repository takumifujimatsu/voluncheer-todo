"use client";

import { Heart, Pencil, MessageCircle, Plus, Minus, Quote, User, EyeOff } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { memberDisplayName, type Member } from "./AddTaskModal";
import {
  CONDITION_LABELS,
  type ConditionStatus,
  type OneOnOneFeedback,
  type PeerBonus,
} from "@/types/dashboard";
import { getWeekLabel } from "@/lib/weekUtils";
import { formatUpdatedAt } from "@/lib/dateUtils";

export type MemberDashboardCardProps = {
  member: Member;
  /** 1on1フィードバック（管理者のみ更新可） */
  oneOnOne: OneOnOneFeedback | null;
  /** コンディションステータス */
  condition: ConditionStatus | null;
  /** コンディション更新日時 */
  conditionUpdatedAt?: unknown;
  /** 最近受け取ったありがとう（最大3件） */
  recentBonuses: PeerBonus[];
  /** スコア推移（グラフ用） */
  scoreHistory: { weekKey: string; score: number }[];
  /** 表示週ラベル */
  weekLabel: string;
  /** 現在のユーザー uid（自分のカードかどうか） */
  currentUserUid: string | undefined;
  /** 管理者かどうか（1on1編集可） */
  isAdmin: boolean;
  onEditOneOnOne: () => void;
  onUpdateCondition: (status: ConditionStatus) => void;
  onSendPeerBonus: () => void;
  /** ダッシュボードから非表示（1on1管理者のみ） */
  onHideFromDashboard?: () => void;
};

export function MemberDashboardCard({
  member,
  oneOnOne,
  condition,
  conditionUpdatedAt,
  recentBonuses,
  scoreHistory,
  weekLabel,
  currentUserUid,
  isAdmin,
  onEditOneOnOne,
  onUpdateCondition,
  onSendPeerBonus,
  onHideFromDashboard,
}: MemberDashboardCardProps) {
  const isOwnCard = currentUserUid === member.uid;
  const isHelp = condition === "help";
  const displayDepts = member.departments?.filter((d) => d && d !== "全体") ?? [];
  const freshnessText = formatUpdatedAt(oneOnOne?.updatedAt ?? conditionUpdatedAt) || weekLabel;

  const chartData = scoreHistory.map((h) => {
    const parts = h.weekKey.split("-");
    const month = parseInt(parts[1] ?? "1", 10);
    const weekNum = parts[2] ?? "1";
    return { ...h, label: `${month}月第${weekNum}週` };
  });

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:shadow-lg dark:border-slate-600 dark:bg-slate-800 ${
        isHelp ? "ring-2 ring-amber-400/50 dark:ring-amber-500/50" : ""
      }`}
    >
      {/* ① 識別情報セクション */}
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-600">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2EABE3]/15 text-[#2EABE3]">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">
                {memberDisplayName(member)}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                {displayDepts.length > 0 && (
                  <span>{displayDepts.join("、")}</span>
                )}
                <span>・{freshnessText}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onEditOneOnOne}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title="1on1フィードバックを編集"
                aria-label="1on1フィードバックを編集"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {onHideFromDashboard && (
                <button
                  type="button"
                  onClick={onHideFromDashboard}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  title="ダッシュボードから非表示"
                  aria-label="ダッシュボードから非表示"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {!isOwnCard && (
            <button
              type="button"
              onClick={onSendPeerBonus}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
              title="ありがとうを贈る"
              aria-label="ありがとうを贈る"
            >
              <Heart className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* ② 指標セクション */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {oneOnOne && (
          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Current Score
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-emerald-600 dark:text-emerald-500">
                {oneOnOne.score}
              </span>
              <span className="text-lg font-medium text-slate-400 dark:text-slate-500">/10点</span>
            </div>
          </div>
        )}
        {condition && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              isHelp
                ? "animate-pulse bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                : condition === "good"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : condition === "busy"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200"
            }`}
          >
            {condition === "good" && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
            )}
            {CONDITION_LABELS[condition]}
          </span>
        )}
        {isOwnCard && !condition && (
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value as ConditionStatus;
              if (v) onUpdateCondition(v);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 outline-none focus:border-[#2EABE3] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            <option value="">コンディションを選択</option>
            {(Object.entries(CONDITION_LABELS) as [ConditionStatus, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        )}
        {isOwnCard && condition && (
          <select
            value={condition}
            onChange={(e) => {
              const v = e.target.value as ConditionStatus;
              if (v) onUpdateCondition(v);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-600 outline-none focus:border-[#2EABE3] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            {(Object.entries(CONDITION_LABELS) as [ConditionStatus, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        )}
      </div>

      {/* スコア推移ミニグラフ */}
      {chartData.length > 0 && (
        <div className="mb-4 h-28 sm:h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${member.uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2EABE3" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2EABE3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <YAxis domain={[0, 10]} hide />
              <ReferenceLine y={0} stroke="#94a3b8" strokeOpacity={0.4} strokeDasharray="2 2" />
              <ReferenceLine y={5} stroke="#94a3b8" strokeOpacity={0.4} strokeDasharray="2 2" />
              <ReferenceLine y={10} stroke="#94a3b8" strokeOpacity={0.4} strokeDasharray="2 2" />
              <Tooltip
                contentStyle={{ borderRadius: "0.5rem", fontSize: "0.75rem" }}
                formatter={(value: number | undefined) => [value != null ? `${value}点` : "—", "スコア"]}
                labelFormatter={(_, payload) =>
                  payload?.[0] ? getWeekLabel((payload[0].payload as { weekKey: string }).weekKey) : ""
                }
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#2EABE3"
                strokeWidth={2}
                fill={`url(#grad-${member.uid})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ③ 定性フィードバックセクション（WEEKLY PROGRESS / CURRENT CHALLENGES） */}
      <div className="mb-4 space-y-4">
        {/* WEEKLY PROGRESS */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Weekly Progress
            </span>
          </div>
          {oneOnOne?.plusText ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">{oneOnOne.plusText}</p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
          )}
        </div>

        {/* CURRENT CHALLENGES */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Minus className="h-3.5 w-3.5 shrink-0 text-red-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Current Challenges
            </span>
          </div>
          {oneOnOne?.minusText ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">{oneOnOne.minusText}</p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
          )}
        </div>

        {!oneOnOne && (
          <p className="text-sm text-slate-400 dark:text-slate-500">1on1フィードバックはまだありません</p>
        )}
      </div>

      {/* ④ THANKS セクション */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-700/30">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Thanks
          </span>
        </div>
        {recentBonuses.length > 0 ? (
          <ul className="space-y-3">
            {recentBonuses.map((b) => (
              <li key={b.id} className="flex gap-2">
                <Quote className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                <p className="text-sm text-slate-700 dark:text-slate-300">{b.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex gap-2">
            <Quote className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {!isOwnCard ? (
                <>
                  <p>まだメッセージがありません</p>
                  <button
                    type="button"
                    onClick={onSendPeerBonus}
                    className="mt-2 text-[#2EABE3] underline hover:no-underline"
                  >
                    ありがとうを贈る
                  </button>
                </>
              ) : (
                <p>届いたメッセージがここに表示されます</p>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
