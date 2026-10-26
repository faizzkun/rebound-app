// Provisional discipline score — documented formula.
// score = completed categories / applicable categories.
// Categories (each 1 point when complete):
//  Prayer: all 5 prayers performed today.
//  Sleep: a sleep session with a wake_time recorded.
//  Focus: completed focus minutes >= daily target (default 240, from profiles).
//  Workout: a workout session with status 'completed' today.
//  Habits: every active habit definition logged done today. NOT APPLICABLE
//          (excluded from the denominator) when no active habit definitions exist.
//  Grooming: both morning and evening grooming logs today.
//  Reading: at least one reading session today.
//  Journal: at least one journal entry today.
// The score is PROVISIONAL until Finish Day writes it to daily_summaries
// with score_status='final'. Unlogged is not failure — it simply is not counted
// as complete, and a missed day can always be followed by a rebound.
export interface ScoreInput {
  prayersPerformed: number;
  sleepWithWake: boolean;
  focusMinutes: number;
  focusTarget: number;
  workoutCompleted: boolean;
  habitsApplicable: boolean;
  habitsAllDone: boolean;
  groomingBothSlots: boolean;
  readingDone: boolean;
  journalDone: boolean;
}

export interface ScoreResult {
  completed: number;
  denominator: number;
  score: number | null; // 0..1, null when denominator is 0
  breakdown: { label: string; done: boolean; applicable: boolean }[];
}

export function computeScore(i: ScoreInput): ScoreResult {
  const rows: { label: string; done: boolean; applicable: boolean }[] = [
    { label: 'Prayer (all 5)', done: i.prayersPerformed >= 5, applicable: true },
    { label: 'Sleep (wake time logged)', done: i.sleepWithWake, applicable: true },
    { label: `Focus (${i.focusMinutes}/${i.focusTarget} min)`, done: i.focusMinutes >= i.focusTarget, applicable: true },
    { label: 'Workout', done: i.workoutCompleted, applicable: true },
    { label: 'Habits', done: i.habitsAllDone, applicable: i.habitsApplicable },
    { label: 'Grooming (morning + evening)', done: i.groomingBothSlots, applicable: true },
    { label: 'Reading', done: i.readingDone, applicable: true },
    { label: 'Journal', done: i.journalDone, applicable: true },
  ];
  const applicable = rows.filter((r) => r.applicable);
  const completed = applicable.filter((r) => r.done).length;
  return { completed, denominator: applicable.length, score: applicable.length ? completed / applicable.length : null, breakdown: rows };
}

export const VISIBILITY_CATEGORIES = [
  'prayer', 'sleep', 'reading', 'workout', 'focus', 'habits', 'grooming',
  'nutrition', 'journal', 'life_events', 'finance', 'achievements', 'streaks',
] as const;

export const PRAYERS = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'] as const;
