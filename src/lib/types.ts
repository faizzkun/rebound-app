// Row shapes matching ~/workspace/rebound/supabase/migrations/001_core_schema.sql.
// Only the columns this app reads/writes are listed; all ids are uuids.
export interface PrayerLog { id: string; owner_id: string; prayer_date: string; prayer: string; performed: boolean; on_time: boolean | null; with_jamaat: boolean | null; is_late: boolean; is_qaza: boolean; performed_at: string | null; notes: string | null; }
export interface QazaRow { id: string; owner_id: string; prayer: string; outstanding_qty: number; recorded_date: string; fulfilled_date: string | null; status: string; }
export interface SleepRow { id: string; owner_id: string; bed_date: string; bedtime: string; wake_time: string | null; is_nap: boolean; notes: string | null; }
export interface ReadingSession { id: string; owner_id: string; book_title: string; author: string | null; start_page: number | null; end_page: number | null; duration_minutes: number | null; last_sentence: string | null; session_date: string; }
export interface Bookmark { id: string; owner_id: string; book_title: string; author: string | null; last_page: number | null; last_sentence: string | null; }
export interface LearningNote { id: string; owner_id: string; title: string | null; takeaways: string | null; new_knowledge: string | null; lessons_learned: string | null; reflection: string | null; note_date: string; }
export interface WorkoutSession { id: string; owner_id: string; session_date: string; duration_minutes: number | null; status: string; notes: string | null; }
export interface WorkoutExercise { id: string; session_id: string; owner_id: string; exercise_name: string; sets: number | null; reps: number | null; weight: number | null; }
export interface FocusSession { id: string; owner_id: string; session_date: string; start_at: string; end_at: string | null; project_task: string | null; output: string | null; learned: string | null; obstacles: string | null; interruptions: string | null; entry_kind: string; }
export interface HabitDef { id: string; owner_id: string; name: string; slot: string | null; target_per_day: number; active: boolean; }
export interface HabitLog { id: string; owner_id: string; habit_id: string | null; log_date: string; done: boolean; }
export interface GroomingLog { id: string; owner_id: string; log_date: string; slot: string; face_wash: boolean; teeth_brush: boolean; }
export interface NutritionLog { id: string; owner_id: string; log_date: string; kind: string; description: string | null; amount_spent: number | null; reason: string | null; notes: string | null; }
export interface SelfControlLog { id: string; owner_id: string; log_date: string; category: string; occurred: boolean; content_kind: string | null; context: string | null; trigger: string | null; reflection: string | null; }
export interface JournalEntry { id: string; owner_id: string; entry_date: string; body: string | null; went_well: string | null; went_wrong: string | null; learned: string | null; improve_tomorrow: string | null; mood: number | null; energy: number | null; tags: string[] | null; }
export interface LifeEvent { id: string; owner_id: string; title: string; purpose: string | null; event_date: string; depart_at: string | null; return_at: string | null; destination: string | null; activities: string | null; outcomes: string | null; learned: string | null; money_spent: number | null; importance: number | null; worthwhile_reflection: string | null; is_public: boolean; }
export interface FinAccount { id: string; owner_id: string; name: string; currency: string; opening_balance: number; }
export interface FinTxn { id: string; owner_id: string; account_id: string; kind: string; category: string | null; txn_at: string; amount: number; currency: string; source_destination: string | null; description: string | null; reason: string | null; planned: boolean | null; spending_class: string | null; notes: string | null; }
export interface VisibilityRow { id: string; owner_id: string; category: string; is_public: boolean; }
export interface Profile { id: string; display_name: string | null; timezone: string; currency: string; focus_daily_target_minutes: number; }
export interface UserPrefs { user_id: string; day_boundary_time: string; junk_food_definition: string | null; }
export interface DailySummary { id: string; owner_id: string; summary_date: string; discipline_score: number | null; score_denominator: number | null; score_status: string; finalized_at: string | null; }
