"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { Heart, Search, BarChart3, Smile, AlertCircle } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { type Member, memberDisplayName } from "./AddTaskModal";
import { MemberDashboardCard } from "./MemberDashboardCard";
import { OneOnOneFeedbackModal } from "./OneOnOneFeedbackModal";
import { PeerBonusModal } from "./PeerBonusModal";
import { DashboardCharts } from "./DashboardCharts";
import {
  ADMIN_EMAIL_ONEONONE,
  type ConditionStatus,
  type OneOnOneFeedback,
  type PeerBonus,
} from "@/types/dashboard";
import { DEPARTMENTS } from "@/types/task";
import { getWeekKey, getWeekLabel, getRecentWeekKeys } from "@/lib/weekUtils";

const PEER_BONUS_DISPLAY_LIMIT = 3;
const HISTORY_WEEKS = 12;

export type DashboardViewProps = {
  members: Member[];
  currentUserUid: string | undefined;
  currentUserEmail: string | null;
};

type FeedbackEntry = OneOnOneFeedback & { weekKey: string };

export function DashboardView({
  members,
  currentUserUid,
  currentUserEmail,
}: DashboardViewProps) {
  const [historyMap, setHistoryMap] = useState<Record<string, FeedbackEntry>>({});
  const [legacyMap, setLegacyMap] = useState<Record<string, OneOnOneFeedback>>({});
  const [conditionMap, setConditionMap] = useState<Record<string, { status: ConditionStatus; updatedAt?: unknown }>>({});
  const [peerBonuses, setPeerBonuses] = useState<PeerBonus[]>([]);
  const [oneOnOneModalMember, setOneOnOneModalMember] = useState<Member | null>(null);
  const [peerBonusModalOpen, setPeerBonusModalOpen] = useState(false);
  const [peerBonusDefaultToUid, setPeerBonusDefaultToUid] = useState<string | undefined>();
  const [selectedWeekKey, setSelectedWeekKey] = useState(getWeekKey(new Date()));
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const weekOptions = getRecentWeekKeys(HISTORY_WEEKS);
  const isAdmin = currentUserEmail === ADMIN_EMAIL_ONEONONE;

  // 週次履歴購読
  useEffect(() => {
    const db = getDb();
    const q = query(
      collection(db, "memberOneOnOneFeedbackHistory"),
      orderBy("weekKey", "desc"),
      limit(500)
    );
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, FeedbackEntry> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const memberUid = data.memberUid as string;
        const weekKey = data.weekKey as string;
        const key = `${memberUid}_${weekKey}`;
        map[key] = {
          score: (data.score as number) ?? 0,
          plusText: (data.plusText as string) ?? "",
          minusText: (data.minusText as string) ?? "",
          updatedAt: data.updatedAt,
          updatedBy: (data.updatedBy as string) ?? "",
          weekKey,
        };
      });
      setHistoryMap(map);
    });
    return () => unsub();
  }, []);

  // レガシー1on1（後方互換）
  useEffect(() => {
    if (members.length === 0) return;
    const db = getDb();
    const unsubs: Unsubscribe[] = members.map((m) =>
      onSnapshot(doc(db, "memberOneOnOneFeedback", m.uid), (snap) => {
        const data = snap.data();
        if (data) {
          setLegacyMap((prev) => ({
            ...prev,
            [m.uid]: {
              score: (data.score as number) ?? 0,
              plusText: (data.plusText as string) ?? "",
              minusText: (data.minusText as string) ?? "",
              updatedAt: data.updatedAt,
              updatedBy: (data.updatedBy as string) ?? "",
            },
          }));
        } else {
          setLegacyMap((prev) => {
            const next = { ...prev };
            delete next[m.uid];
            return next;
          });
        }
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [members]);

  // コンディション購読
  useEffect(() => {
    if (members.length === 0) return;
    const db = getDb();
    const unsubs: Unsubscribe[] = members.map((m) =>
      onSnapshot(doc(db, "memberConditions", m.uid), (snap) => {
        const data = snap.data();
        if (data?.status) {
          setConditionMap((prev) => ({
            ...prev,
            [m.uid]: { status: data.status as ConditionStatus, updatedAt: data.updatedAt },
          }));
        } else {
          setConditionMap((prev) => {
            const next = { ...prev };
            delete next[m.uid];
            return next;
          });
        }
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [members]);

  // ありがとうメッセージ購読
  useEffect(() => {
    const db = getDb();
    const q = query(
      collection(db, "peerBonuses"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: PeerBonus[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          toUid: data.toUid ?? "",
          fromUid: data.fromUid ?? "",
          message: data.message ?? "",
          createdAt: data.createdAt,
        };
      });
      setPeerBonuses(list);
    });
    return () => unsub();
  }, []);

  const getFeedbackForMember = (memberUid: string): OneOnOneFeedback | null => {
    const historyKey = `${memberUid}_${selectedWeekKey}`;
    const fromHistory = historyMap[historyKey];
    if (fromHistory) return fromHistory;
    if (selectedWeekKey === getWeekKey(new Date())) {
      return legacyMap[memberUid] ?? null;
    }
    return null;
  };

  const getFeedbackByWeekForMember = (memberUid: string): Record<string, { score: number; plusText: string; minusText: string }> => {
    const result: Record<string, { score: number; plusText: string; minusText: string }> = {};
    const currentWeek = getWeekKey(new Date());
    for (const wk of weekOptions) {
      const key = `${memberUid}_${wk}`;
      const fromHistory = historyMap[key];
      if (fromHistory) {
        result[wk] = { score: fromHistory.score, plusText: fromHistory.plusText, minusText: fromHistory.minusText };
      } else if (wk === currentWeek && legacyMap[memberUid]) {
        const leg = legacyMap[memberUid];
        result[wk] = { score: leg.score, plusText: leg.plusText, minusText: leg.minusText };
      }
    }
    return result;
  };

  const getScoreHistoryForMember = (memberUid: string): { weekKey: string; score: number }[] => {
    return weekOptions
      .map((wk) => {
        const key = `${memberUid}_${wk}`;
        const entry = historyMap[key];
        if (entry) return { weekKey: wk, score: entry.score };
        if (wk === getWeekKey(new Date()) && legacyMap[memberUid]) {
          return { weekKey: wk, score: legacyMap[memberUid].score };
        }
        return null;
      })
      .filter((x): x is { weekKey: string; score: number } => x != null)
      .reverse();
  };

  const groupedByDepartment = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const d of DEPARTMENTS as readonly string[]) {
      map.set(d, []);
    }
    map.set("未設定", []);
    for (const m of members) {
      const depts = m.departments?.filter((d) => d?.trim()) ?? [];
      if (depts.length === 0) {
        map.get("未設定")!.push(m);
      } else {
        for (const dept of depts) {
          if (map.has(dept)) map.get(dept)!.push(m);
        }
      }
    }
    const result: { department: string; members: Member[] }[] = [];
    for (const d of DEPARTMENTS as readonly string[]) {
      const list = map.get(d)!;
      if (list.length > 0) result.push({ department: d, members: list });
    }
    const unset = map.get("未設定")!;
    if (unset.length > 0) result.push({ department: "未設定", members: unset });
    return result;
  }, [members]);

  const filteredGroups = useMemo(() => {
    let groups = groupedByDepartment;
    if (selectedDepartment) {
      const found = groupedByDepartment.find((g) => g.department === selectedDepartment);
      groups = found ? [found] : [{ department: selectedDepartment, members: [] }];
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.map((g) => ({
      ...g,
      members: g.members.filter(
        (m) =>
          memberDisplayName(m).toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.departments?.some((d) => d?.toLowerCase().includes(q))
      ),
    }));
  }, [groupedByDepartment, selectedDepartment, searchQuery]);

  const quickStats = useMemo(() => {
    const allMembers = filteredGroups.flatMap((g) => g.members);
    const scores = allMembers
      .map((m) => getFeedbackForMember(m.uid)?.score)
      .filter((s): s is number => s != null && s > 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highCondition = allMembers.filter(
      (m) => conditionMap[m.uid]?.status === "good"
    ).length;
    const needFollowUp = allMembers.filter(
      (m) => conditionMap[m.uid]?.status === "help"
    ).length;
    return {
      avgScore: Math.round(avgScore * 10) / 10,
      highCondition,
      needFollowUp,
    };
  }, [filteredGroups, historyMap, legacyMap, selectedWeekKey, conditionMap]);

  const deptAverages = useMemo(() => {
    return groupedByDepartment
      .filter((g) => g.department !== "全体" && g.department !== "未設定")
      .map(({ department, members: deptMembers }) => {
        const scores = deptMembers
          .map((m) => {
            const f = getFeedbackForMember(m.uid);
            return f?.score;
          })
          .filter((s): s is number => s != null && s > 0);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { department, average: Math.round(avg * 10) / 10, count: scores.length };
      })
      .filter((d) => d.count > 0);
  }, [groupedByDepartment, historyMap, legacyMap, selectedWeekKey]);

  const weeklyTrend = useMemo(() => {
    const depts = groupedByDepartment
      .filter((g) => g.department !== "全体" && g.department !== "未設定")
      .map((g) => g.department);
    const deptFilter = selectedDepartment && depts.includes(selectedDepartment) ? [selectedDepartment] : depts;

    const rows = weekOptions.map((weekKey) => {
      const row: Record<string, string | number> = { weekKey };
      for (const dept of deptFilter) {
        const group = groupedByDepartment.find((g) => g.department === dept);
        if (!group) continue;
        const scores = group.members
          .map((m) => {
            const key = `${m.uid}_${weekKey}`;
            const h = historyMap[key];
            if (h) return h.score;
            if (weekKey === getWeekKey(new Date()) && legacyMap[m.uid]) return legacyMap[m.uid].score;
            return null;
          })
          .filter((s): s is number => s != null && s > 0);
        if (scores.length > 0) {
          row[dept] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        }
      }
      return row;
    });
    return rows.reverse();
  }, [groupedByDepartment, historyMap, legacyMap, selectedDepartment, weekOptions]);

  const getRecentBonusesForMember = (uid: string): PeerBonus[] => {
    return peerBonuses
      .filter((b) => b.toUid === uid)
      .slice(0, PEER_BONUS_DISPLAY_LIMIT);
  };

  const handleSaveOneOnOne = async (
    memberUid: string,
    weekKey: string,
    params: { score: number; plusText: string; minusText: string }
  ) => {
    if (!currentUserUid) return;
    const db = getDb();
    const docId = `${memberUid}_${weekKey}`;
    await setDoc(doc(db, "memberOneOnOneFeedbackHistory", docId), {
      memberUid,
      weekKey,
      score: params.score,
      plusText: params.plusText,
      minusText: params.minusText,
      updatedAt: serverTimestamp(),
      updatedBy: currentUserUid,
    });
    setOneOnOneModalMember(null);
  };

  const handleUpdateCondition = async (memberUid: string, status: ConditionStatus) => {
    if (!currentUserUid || currentUserUid !== memberUid) return;
    const db = getDb();
    await setDoc(
      doc(db, "memberConditions", memberUid),
      { status, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  const handleSendPeerBonus = async (params: { toUid: string; message: string }) => {
    if (!currentUserUid) return;
    const db = getDb();
    await addDoc(collection(db, "peerBonuses"), {
      toUid: params.toUid,
      fromUid: currentUserUid,
      message: params.message,
      createdAt: serverTimestamp(),
    });
    setPeerBonusModalOpen(false);
    setPeerBonusDefaultToUid(undefined);
  };

  const openPeerBonusFor = (toUid?: string) => {
    setPeerBonusDefaultToUid(toUid);
    setPeerBonusModalOpen(true);
  };

  const departmentTabs = useMemo(() => {
    const base = [{ key: null, label: "全部署" }];
    const depts = (DEPARTMENTS as readonly string[])
      .filter((d) => d !== "全体")
      .map((d) => ({ key: d as string | null, label: d }));
    return [...base, ...depts, { key: "未設定" as string | null, label: "未設定" }];
  }, []);

  return (
    <div className="space-y-6">
      {/* A. 俯瞰・統計エリア（ヘッダー） */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600 dark:bg-slate-800">
        <h2 className="mb-5 text-lg font-bold text-slate-800 dark:text-slate-100">
          メンバーダッシュボード
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2EABE3]/15 text-[#2EABE3]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums text-[#2EABE3]">{quickStats.avgScore}</p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">平均スコア</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Smile className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {quickStats.highCondition}
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">高コンディション</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {quickStats.needFollowUp}
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">要フォロー</p>
            </div>
          </div>
        </div>
      </div>

      {/* B. フィルター・コントロールエリア */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前や部署で検索"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedWeekKey}
              onChange={(e) => setSelectedWeekKey(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#2EABE3] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {weekOptions.map((wk) => (
                <option key={wk} value={wk}>
                  {getWeekLabel(wk)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => openPeerBonusFor()}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600"
            >
              <Heart className="h-4 w-4" />
              ありがとうを贈る
            </button>
          </div>
        </div>

        {/* 部署タブ */}
        <div className="flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-600 dark:bg-slate-800/80">
          {departmentTabs.map(({ key, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedDepartment(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selectedDepartment === key
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-600 hover:bg-white/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* グラフ */}
      <DashboardCharts
        deptAverages={deptAverages}
        weeklyTrend={weeklyTrend}
        selectedDepartment={selectedDepartment}
      />

      {/* メンバーカード（部署別） */}
      {filteredGroups.map(({ department, members: deptMembers }) => (
        <section key={department} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-[#2EABE3]" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {department}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              — {getWeekLabel(selectedWeekKey)}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deptMembers.map((member) => (
              <MemberDashboardCard
                key={member.uid}
                member={member}
                oneOnOne={getFeedbackForMember(member.uid)}
                condition={conditionMap[member.uid]?.status ?? null}
                conditionUpdatedAt={conditionMap[member.uid]?.updatedAt}
                recentBonuses={getRecentBonusesForMember(member.uid)}
                scoreHistory={getScoreHistoryForMember(member.uid)}
                weekLabel={getWeekLabel(selectedWeekKey)}
                currentUserUid={currentUserUid}
                isAdmin={isAdmin}
                onEditOneOnOne={() => setOneOnOneModalMember(member)}
                onUpdateCondition={(status) => handleUpdateCondition(member.uid, status)}
                onSendPeerBonus={() => openPeerBonusFor(member.uid)}
              />
            ))}
          </div>
        </section>
      ))}

      {filteredGroups.length === 0 && (
        <p className="py-12 text-center text-slate-500 dark:text-slate-400">
          メンバーがいません。プロフィールで所属部署を設定してください。
        </p>
      )}

      {oneOnOneModalMember && (
        <OneOnOneFeedbackModal
          isOpen={!!oneOnOneModalMember}
          onClose={() => setOneOnOneModalMember(null)}
          member={oneOnOneModalMember}
          weekOptions={weekOptions}
          selectedWeekKey={selectedWeekKey}
          feedbackByWeek={getFeedbackByWeekForMember(oneOnOneModalMember.uid)}
          onSubmit={(weekKey, params) => handleSaveOneOnOne(oneOnOneModalMember.uid, weekKey, params)}
        />
      )}

      <PeerBonusModal
        isOpen={peerBonusModalOpen}
        onClose={() => {
          setPeerBonusModalOpen(false);
          setPeerBonusDefaultToUid(undefined);
        }}
        members={members}
        defaultToUid={peerBonusDefaultToUid}
        onSubmit={handleSendPeerBonus}
      />
    </div>
  );
}
