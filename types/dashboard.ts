/**
 * メンバーダッシュボード機能の型定義
 */

/** 1on1フィードバック（管理者のみ更新可） */
export type OneOnOneFeedback = {
  /** 仕事の調子スコア（1〜10） */
  score: number;
  /** プラスだったこと */
  plusText: string;
  /** マイナスだったこと・課題 */
  minusText: string;
  updatedAt: unknown; // Firestore serverTimestamp
  updatedBy: string; // 管理者 uid
};

/** 週次1on1フィードバック履歴（週ごとに保存） */
export type OneOnOneFeedbackEntry = OneOnOneFeedback & {
  memberUid: string;
  weekKey: string; // 例: "2026-01-1"（2026年1月第1週）
};

/** コンディションステータス（各自更新可） */
export const CONDITION_STATUSES = [
  "good",     // 余裕あり
  "normal",   // 普通
  "busy",     // やや忙しい
  "help",     // ヘルプ！
] as const;

export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export const CONDITION_LABELS: Record<ConditionStatus, string> = {
  good: "余裕あり",
  normal: "普通",
  busy: "やや忙しい",
  help: "ヘルプ！",
};

export type MemberCondition = {
  status: ConditionStatus;
  updatedAt: unknown; // Firestore serverTimestamp
};

/** ありがとうメッセージ（誰でも投稿可） */
export type PeerBonus = {
  id: string;
  /** 宛先（誰宛か） */
  toUid: string;
  /** 送信者 */
  fromUid: string;
  /** 感謝のメッセージ内容 */
  message: string;
  createdAt: unknown; // Firestore Timestamp
};

/** 1on1フィードバックを更新できる管理者のメールアドレス */
export const ADMIN_EMAIL_ONEONONE = "fujimatsu.t@voluncheer.or.jp";
