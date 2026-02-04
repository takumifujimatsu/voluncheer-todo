/**
 * Firebase Functions: Discord 通知（毎日 7:00 JST に今日・明日の To Do を部署別に送信）
 *
 * 本番では Webhook URL 等は環境変数または Secret Manager に移すことを推奨します。
 */

const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

initializeApp();

/** 部署ごとの Discord Webhook URL とメンション（@everyone または <@&roleId>） */
const DISCORD_WEBHOOKS = {
  "全体": {
    url: "https://discord.com/api/webhooks/1468294390798880940/tm5xSovV3oPaqwJmWMFtEDOVPsX7Bj99BebVwkuHnlXtIR3a53SUE8XVLq9QQu8b-kxk",
    mention: "@everyone",
  },
  "執行役員": {
    url: "https://discord.com/api/webhooks/1468294670852423806/yRTzY9JY5oOqp1mUJGxo-emUYzNBdWS33KXNu2TXKqGArV4u9PyaWwNi_gV_44W4HB7H",
    mention: "<@&1441052480732401744>",
  },
  "開発部": {
    url: "https://discord.com/api/webhooks/1468294816008896643/1k2W9r1EQMobGpYLO73RnUgCIy_5wck7Fqb79amroLApIXvhPk-WxSAX0IgmKxf_02Fr",
    mention: "<@&1439998345849340005>",
  },
  "広報部": {
    url: "https://discord.com/api/webhooks/1468294899945312468/fsT2_qlPKHhAbSnZgIzIxq_U-1loXuaNK0uuSn8ANYNI7d1PzJR7jNLRVO1hpLWgmYF",
    mention: "<@&1441052809331216526>",
  },
  "デザイン部": {
    url: "https://discord.com/api/webhooks/1468294989858472029/lJxLOpfJXx56WaoAVqud8fJBXO1n_dE9uBl7LlFlqHsc3qOTi1tPQxnbmR1sDsDj56me",
    mention: "<@&1441058746825703518>",
  },
  "営業部": {
    url: "https://discord.com/api/webhooks/1468295125447741571/Ck4w1uBe9vW_VXyXSJr6mF68-QOrqYm4cuKRfslY-H0GBVTcihPxcBL-L9CvgI7dZlvw",
    mention: "<@&1441052991246307440>",
  },
  "オペレーション部": {
    url: "https://discord.com/api/webhooks/1468295205999349830/ke7_SHZq-yL-tnvXv2zTjMxIuFiwv3wPqIlsn9ZS_9PlIUJYz_MUwndqlsQB2A9NY0fp",
    mention: "<@&1441052879375958241>",
  },
  "経理部": {
    url: "https://discord.com/api/webhooks/1468295290862698527/LtcAfCcoU0Mb6rhY0_CrQoJC4X5_-RX97xPeWxSzc0HC6Nq_-iZVPvcZDZRrGzOvJOQL",
    mention: "<@&1441058738294489190>",
  },
  "総務部": {
    url: "https://discord.com/api/webhooks/1468295367664599226/uwgca1oHN9ql8QhZgKuGOsEIbRXQzOWb-ldrt1HkBUiYoElCfzs1arYk2T8jzQsd_zWE",
    mention: "<@&1441058778488377354>",
  },
  "企画部": {
    url: "https://discord.com/api/webhooks/1468295432789688615/xguiXbemc7ZpG0XD9edMaitXteA_JMUYDF5SUzv7tWzA8zD3kNyBBRIzkJ1y65uOGWUp",
    mention: "<@&1468295980884562061>",
  },
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n) {
  return String(n).padStart(2, "0");
}

/** 指定日時を JST の YYYY-MM-DD に変換 */
function toJstDateString(date) {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`;
}

/** Firestore の dueDate (Timestamp 等) から JST の YYYY-MM-DD を取得 */
function getTaskDueDateString(dueDate) {
  if (dueDate == null) return null;
  if (dueDate instanceof Timestamp) {
    return toJstDateString(dueDate.toDate());
  }
  if (dueDate instanceof Date) {
    return toJstDateString(dueDate);
  }
  return null;
}

/** タスクを「今日」「明日」で分類（status は todo/doing に限定済み想定） */
function groupTasksByTodayTomorrow(tasks, todayStr, tomorrowStr) {
  const today = [];
  const tomorrow = [];
  for (const t of tasks) {
    const dueStr = getTaskDueDateString(t.dueDate);
    if (dueStr === todayStr) today.push(t);
    else if (dueStr === tomorrowStr) tomorrow.push(t);
  }
  return {today, tomorrow};
}

/** 1 部署用の Discord メッセージ本文を組み立て（メンション除く） */
function buildDepartmentMessage(todayTasks, tomorrowTasks) {
  const lines = [];
  lines.push("## 📅 今日の To Do");
  if (todayTasks.length === 0) {
    lines.push("特に予定ないよ");
  } else {
    for (const t of todayTasks) {
      const assignee = t.assigneeName && t.assigneeName.trim() ? t.assigneeName.trim() : "未割り当て";
      lines.push(`・ ${t.title}（担当: ${assignee}）`);
    }
  }
  lines.push("");
  lines.push("## 📅 明日の To Do");
  if (tomorrowTasks.length === 0) {
    lines.push("特に予定ないよ");
  } else {
    for (const t of tomorrowTasks) {
      const assignee = t.assigneeName && t.assigneeName.trim() ? t.assigneeName.trim() : "未割り当て";
      lines.push(`・ ${t.title}（担当: ${assignee}）`);
    }
  }
  return lines.join("\n");
}

/** Discord Webhook に POST（content は 2000 文字制限あり） */
async function sendToDiscord(webhookUrl, content) {
  const body = JSON.stringify({content: content.slice(0, 2000)});
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook failed: ${res.status} ${text}`);
  }
}

/** 今日・明日の To Do を取得し、部署別に Discord へ送信する本体 */
async function runDiscordDailyTodoNotify() {
  const db = getFirestore();
  const now = new Date();
  const todayStr = toJstDateString(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = toJstDateString(tomorrow);

  const snap = await db.collection("tasks")
    .where("status", "in", ["todo", "doing"])
    .get();

  const tasks = [];
  snap.docs.forEach((doc) => {
    const d = doc.data();
    const rawDepts = d.departments ?? d.department;
    const departments = Array.isArray(rawDepts)
      ? rawDepts
      : rawDepts ? [rawDepts] : [];
    tasks.push({
      id: doc.id,
      title: d.title ?? "",
      departments,
      assigneeName: d.assigneeName ?? null,
      dueDate: d.dueDate ?? null,
    });
  });

  const {today: todayAll, tomorrow: tomorrowAll} =
    groupTasksByTodayTomorrow(tasks, todayStr, tomorrowStr);

  for (const [deptName, config] of Object.entries(DISCORD_WEBHOOKS)) {
    const deptToday = todayAll.filter((t) => t.departments.includes(deptName));
    const deptTomorrow = tomorrowAll.filter((t) => t.departments.includes(deptName));
    // 全体（@everyone）のときは、今日・明日どちらも予定がない場合は送らない
    if (deptName === "全体" && deptToday.length === 0 && deptTomorrow.length === 0) {
      logger.info(`Discord skipped for ${deptName} (no tasks)`);
      continue;
    }
    const body = buildDepartmentMessage(deptToday, deptTomorrow);
    const content = `${config.mention}\n\n${body}`;
    try {
      await sendToDiscord(config.url, content);
      logger.info(`Discord sent for ${deptName}`);
    } catch (e) {
      logger.error(`Discord failed for ${deptName}`, e);
    }
  }
}

/** 毎日 7:00 JST に実行 */
exports.discordDailyTodoNotify = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Asia/Tokyo",
  },
  async () => {
    await runDiscordDailyTodoNotify();
  }
);

/** 手動テスト用 HTTP（デプロイ後、認証なしで叩くと実行されるため本番では無効化推奨） */
exports.discordDailyTodoNotifyManual = onRequest(
  {cors: false},
  async (req, res) => {
    try {
      await runDiscordDailyTodoNotify();
      res.status(200).send("OK");
    } catch (e) {
      logger.error("discordDailyTodoNotifyManual", e);
      res.status(500).send(String(e.message));
    }
  }
);
