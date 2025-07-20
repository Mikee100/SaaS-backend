// REDIS/BullMQ queues and workers are commented out for development without Redis.
// Uncomment and ensure Redis is running for background jobs and email/report queues.

// import { Queue, Worker, Job } from 'bullmq';
// import nodemailer from 'nodemailer';

// const connection = {
//   host: process.env.REDIS_HOST || '127.0.0.1',
//   port: parseInt(process.env.REDIS_PORT || '6379', 10),
// };

// export const emailQueue = new Queue('emailQueue', { connection });
// export const emailWorker = new Worker(
//   'emailQueue',
//   async (job: Job) => {
//     // ... email sending logic ...
//   },
//   { connection }
// );
// emailWorker.on('completed', ...);
// emailWorker.on('failed', ...);

// export const reportQueue = new Queue('reportQueue', { connection });
// export const reportWorker = new Worker(
//   'reportQueue',
//   async (job: Job) => {
//     // ... report generation logic ...
//   },
//   { connection }
// );
// reportWorker.on('completed', ...);
// reportWorker.on('failed', ...); 