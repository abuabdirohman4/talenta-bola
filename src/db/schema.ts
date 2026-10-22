import { isNull, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Tenancy flat: semua tabel bawa ssb_id sejak awal walau demo cuma satu SSB.
const ts = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const attendanceStatus = pgEnum("attendance_status", ["HADIR", "IZIN", "SAKIT", "ALPA"]);
export const permissionType = pgEnum("permission_type", ["IZIN", "SAKIT"]);
export const sessionStatus = pgEnum("session_status", ["SCHEDULED", "CANCELLED"]);

export const ssbProfiles = pgTable(
  "ssb_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color").default("#059669").notNull(),
    phoneWa: text("phone_wa"),
    homeGround: text("home_ground"),
    headCoachName: text("head_coach_name"),
    ...ts,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("ssb_profiles_slug_active_unique").on(t.slug).where(isNull(t.deletedAt))]
);

export const ageGroups = pgTable(
  "age_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ssbId: uuid("ssb_id")
      .notNull()
      .references(() => ssbProfiles.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // "KU-10"
    name: text("name").notNull(), // "KU 2016"
    birthYear: integer("birth_year"),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...ts,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("age_groups_ssb_code_active_unique").on(t.ssbId, t.code).where(isNull(t.deletedAt))]
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ssbId: uuid("ssb_id")
      .notNull()
      .references(() => ssbProfiles.id, { onDelete: "cascade" }),
    ageGroupId: uuid("age_group_id")
      .notNull()
      .references(() => ageGroups.id),
    fullName: text("full_name").notNull(),
    nickname: text("nickname"),
    birthDate: date("birth_date"), // nullable: daftar WA cuma berisi nama
    jerseyNumber: integer("jersey_number"),
    position: text("position"), // GK | DF | MF | FW
    preferredFoot: text("preferred_foot"), // RIGHT | LEFT | BOTH
    heightCm: numeric("height_cm", { precision: 5, scale: 1, mode: "number" }),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1, mode: "number" }),
    parentName: text("parent_name"),
    parentPhoneWa: text("parent_phone_wa"),
    // ponytail: foto disimpan sebagai data URL JPEG ±30 KB di kolom ini; pindah ke object storage kalau pemain > ratusan.
    photoUrl: text("photo_url"),
    // Link ortu tanpa login: token acak per anak, dibuat ulang = link lama mati.
    parentToken: text("parent_token").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...ts,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("players_parent_token_unique").on(t.parentToken),
    index("players_ssb_group_idx").on(t.ssbId, t.ageGroupId),
  ]
);

export const trainingSessions = pgTable(
  "training_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ssbId: uuid("ssb_id")
      .notNull()
      .references(() => ssbProfiles.id, { onDelete: "cascade" }),
    ageGroupId: uuid("age_group_id")
      .notNull()
      .references(() => ageGroups.id),
    sessionDate: date("session_date").notNull(),
    startTime: time("start_time").default("07:30").notNull(),
    location: text("location"),
    topic: text("topic"),
    status: sessionStatus("status").default("SCHEDULED").notNull(),
    ...ts,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("training_sessions_group_date_active_unique")
      .on(t.ageGroupId, t.sessionDate)
      .where(isNull(t.deletedAt)),
  ]
);

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ssbId: uuid("ssb_id")
      .notNull()
      .references(() => ssbProfiles.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull(),
    note: text("note"),
    // Waktu tap di HP pelatih (bukan waktu sampai server) — dasar last-write-wins antrean offline.
    ...ts,
  },
  (t) => [uniqueIndex("attendances_session_player_unique").on(t.sessionId, t.playerId)]
);

export const parentPermissions = pgTable(
  "parent_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ssbId: uuid("ssb_id")
      .notNull()
      .references(() => ssbProfiles.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    type: permissionType("type").notNull(),
    reason: text("reason").notNull(),
    // Diisi saat pelatih menerima/mengabaikan pengajuan yang masuk setelah ia mengisi presensi.
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: ts.createdAt,
  },
  (t) => [index("parent_permissions_session_idx").on(t.sessionId, t.playerId)]
);

export const reportPeriods = pgTable("report_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  ssbId: uuid("ssb_id")
    .notNull()
    .references(() => ssbProfiles.id, { onDelete: "cascade" }),
  ageGroupId: uuid("age_group_id")
    .notNull()
    .references(() => ageGroups.id),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  ...ts,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ssbId: uuid("ssb_id")
      .notNull()
      .references(() => ssbProfiles.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => reportPeriods.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    strengths: text("strengths").default("").notNull(),
    improvements: text("improvements").default("").notNull(),
    nextTarget: text("next_target").default("").notNull(),
    homeTraining: text("home_training").default("").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // Token link rapor yang dibagikan ke keluarga; terpisah dari token ortu supaya link rapor tidak bisa dipakai izin.
    publicToken: text("public_token"),
    ...ts,
  },
  (t) => [
    uniqueIndex("reports_period_player_unique").on(t.periodId, t.playerId),
    uniqueIndex("reports_public_token_unique").on(t.publicToken),
  ]
);

export const reportScores = pgTable(
  "report_scores",
  {
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    aspectKey: text("aspect_key").notNull(),
    score: smallint("score").notNull(),
    updatedAt: ts.updatedAt,
  },
  (t) => [primaryKey({ columns: [t.reportId, t.aspectKey] })]
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  ssbId: uuid("ssb_id").references(() => ssbProfiles.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // create | update | delete | import | publish | unpublish
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id"),
  dataBefore: jsonb("data_before"),
  dataAfter: jsonb("data_after"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});
