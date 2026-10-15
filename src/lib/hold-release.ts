import crypto from "crypto";
import { RELEASE_DAYS_ENFORCEMENT } from "@/lib/contracts";
import { execute, query } from "@/lib/db";
import { releaseExpiredHolds, type HoldReleaseResult } from "@/lib/stock";

const jobName = "release-holds";
const staleAfterMs = 15 * 60 * 1000;
const intervalMs = 5 * 60 * 1000;

const globalForJobs = globalThis as { falcoHoldRelease?: boolean };

export type HoldReleaseJobResult = HoldReleaseResult & {
  id: string;
  stale: boolean;
  durationMs: number;
  error?: string;
};

function assertReleaseDaysDoNotMoveStock() {
  if (RELEASE_DAYS_ENFORCEMENT !== "informational") {
    throw new Error("Automatic release-day stock changes are not implemented");
  }
}

export async function holdReleaseStatus() {
  assertReleaseDaysDoNotMoveStock();
  const rows = await query<{
    status: string;
    finished_at: string | null;
    processed_count: number;
    error: string;
  }>(
    `SELECT status, finished_at, processed_count, error
     FROM job_runs
     WHERE name = ?
     ORDER BY started_at DESC
     LIMIT 1`,
    [jobName],
  );
  const success = await query<{ finished_at: string }>(
    `SELECT finished_at
     FROM job_runs
     WHERE name = ? AND status = 'succeeded' AND finished_at IS NOT NULL
     ORDER BY finished_at DESC
     LIMIT 1`,
    [jobName],
  );
  const lastSuccessAt = success[0]?.finished_at ?? null;
  const stale = Boolean(
    lastSuccessAt && Date.now() - new Date(lastSuccessAt).getTime() > staleAfterMs,
  );
  if (stale) {
    console.error(
      JSON.stringify({
        event: "hold_release_stale",
        job: jobName,
        lastSuccessAt,
        thresholdMinutes: 15,
      }),
    );
  }
  return {
    lastStatus: rows[0]?.status ?? null,
    lastFinishedAt: rows[0]?.finished_at ?? null,
    lastProcessed: Number(rows[0]?.processed_count ?? 0),
    lastError: rows[0]?.error ?? "",
    lastSuccessAt,
    stale,
  };
}

export async function runHoldReleaseJob(): Promise<HoldReleaseJobResult> {
  assertReleaseDaysDoNotMoveStock();
  const id = crypto.randomUUID();
  const startedAt = new Date();
  await execute(
    `INSERT INTO job_runs
      (id, name, status, started_at, processed_count, error)
     VALUES (?, ?, 'running', ?, 0, '')`,
    [id, jobName, startedAt.toISOString()],
  );
  try {
    const previous = await query<{ finished_at: string }>(
      `SELECT finished_at
       FROM job_runs
       WHERE name = ? AND status = 'succeeded' AND finished_at IS NOT NULL
       ORDER BY finished_at DESC
       LIMIT 1`,
      [jobName],
    );
    const result = await releaseExpiredHolds();
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const stale = Boolean(
      previous[0] &&
        finishedAt.getTime() - new Date(previous[0].finished_at).getTime() >
          staleAfterMs,
    );
    if (stale) {
      console.error(
        JSON.stringify({
          event: "hold_release_stale",
          job: jobName,
          lastSuccessAt: previous[0].finished_at,
          thresholdMinutes: 15,
        }),
      );
    }
    await execute(
      `UPDATE job_runs
       SET status = ?, finished_at = ?, duration_ms = ?, processed_count = ?,
           error = ''
       WHERE id = ?`,
      [
        result.skipped ? "skipped" : "succeeded",
        finishedAt.toISOString(),
        durationMs,
        result.processed,
        id,
      ],
    );
    return { ...result, id, stale, durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "hold release failed";
    const finishedAt = new Date();
    console.error(
      JSON.stringify({
        event: "hold_release_failed",
        job: jobName,
        message,
      }),
    );
    await execute(
      `UPDATE job_runs
       SET status = 'failed', finished_at = ?, duration_ms = ?, error = ?
       WHERE id = ?`,
      [
        finishedAt.toISOString(),
        finishedAt.getTime() - startedAt.getTime(),
        message.slice(0, 500),
        id,
      ],
    );
    return {
      id,
      skipped: false,
      processed: 0,
      bookingsCancelled: 0,
      reservationsExpired: 0,
      stale: false,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      error: message,
    };
  }
}

export function startHoldReleaseScheduler() {
  if (globalForJobs.falcoHoldRelease) return;
  if (process.env.HOLD_RELEASE_SCHEDULER === "off") return;
  if (process.env.VITEST || process.env.NODE_ENV === "test") return;
  globalForJobs.falcoHoldRelease = true;
  const run = () => {
    void runHoldReleaseJob().catch((error: unknown) => {
      console.error(
        JSON.stringify({
          event: "hold_release_failed",
          job: jobName,
          message: error instanceof Error ? error.message : "hold release failed",
        }),
      );
    });
  };
  const starter = setTimeout(run, 15_000);
  const timer = setInterval(run, intervalMs);
  starter.unref();
  timer.unref();
}
