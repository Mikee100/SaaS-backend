import { Logger } from '@nestjs/common';

const logger = new Logger('JobQueue');

export const QUEUE_NAMES = {
  EMAIL: 'emailQueue',
  REPORT: 'reportQueue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type JobHandler<T> = (data: T) => Promise<void>;

interface Job<T> {
  id: string;
  queue: QueueName;
  data: T;
  attempt: number;
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;
const CONCURRENCY = 3;

/**
 * Minimal in-process job queue: concurrency-limited, retries failed jobs
 * with backoff, and actually logs outcomes instead of a console.log that
 * unconditionally reported success. No Redis dependency, since none is
 * provisioned in this environment — jobs are lost on process restart, so
 * this suits best-effort work (email delivery) rather than anything that
 * must survive a crash.
 */
class InProcessQueue {
  private handlers = new Map<QueueName, JobHandler<unknown>>();
  private pending: Job<unknown>[] = [];
  private active = 0;
  private nextId = 1;

  registerHandler<T>(queue: QueueName, handler: JobHandler<T>): void {
    this.handlers.set(queue, handler);
  }

  enqueue<T>(queue: QueueName, data: T): string {
    const job: Job<T> = {
      id: `job-${this.nextId++}`,
      queue,
      data,
      attempt: 0,
    };
    this.pending.push(job);
    void this.drain();
    return job.id;
  }

  private drain(): void {
    while (this.active < CONCURRENCY && this.pending.length > 0) {
      const job = this.pending.shift();
      if (!job) break;
      this.active++;
      void this.process(job).finally(() => {
        this.active--;
        this.drain();
      });
    }
  }

  private async process(job: Job<unknown>): Promise<void> {
    const handler = this.handlers.get(job.queue);
    if (!handler) {
      logger.warn(
        `No handler registered for queue "${job.queue}", dropping job ${job.id}`,
      );
      return;
    }
    job.attempt++;
    try {
      await handler(job.data);
      logger.log(`Job ${job.id} on ${job.queue} completed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `Job ${job.id} on ${job.queue} failed (attempt ${job.attempt}/${MAX_ATTEMPTS}): ${message}`,
      );
      if (job.attempt < MAX_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * job.attempt;
        setTimeout(() => {
          this.pending.push(job);
          this.drain();
        }, delay);
      } else {
        logger.error(
          `Job ${job.id} on ${job.queue} exhausted ${MAX_ATTEMPTS} attempts, giving up`,
        );
      }
    }
  }
}

export const jobQueue = new InProcessQueue();

export function processEmail<T>(emailData: T): {
  success: boolean;
  message: string;
  jobId: string;
} {
  const jobId = jobQueue.enqueue(QUEUE_NAMES.EMAIL, emailData);
  return { success: true, message: 'Email queued for processing', jobId };
}

export function processReport<T>(reportData: T): {
  success: boolean;
  message: string;
  jobId: string;
} {
  const jobId = jobQueue.enqueue(QUEUE_NAMES.REPORT, reportData);
  return { success: true, message: 'Report queued for processing', jobId };
}
