import type { TailwindRefactorConfig } from '@tailwind-refactor/config';
import { createResolverForWorkspace } from '@tailwind-refactor/resolver';
import { existsSync, readFileSync } from 'fs';
import { cpus } from 'os';
import { dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { RefactorEngine } from './engine.js';
import type { WorkerBatchResult, WorkerBatchTask } from './worker.js';

export interface ParallelScanOptions {
  files: string[];
  targetDir: string;
  config?: TailwindRefactorConfig;
  maxWorkers?: number;
  batchSize?: number;
  noCache?: boolean;
}

function getWorkerScriptPath(): string {
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

  const candidateCjsDist = resolve(currentDir, '../dist/worker.cjs');
  if (existsSync(candidateCjsDist)) return candidateCjsDist;

  const candidateCjsSame = resolve(currentDir, 'worker.cjs');
  if (existsSync(candidateCjsSame)) return candidateCjsSame;

  const candidateDist = resolve(currentDir, '../dist/worker.js');
  if (existsSync(candidateDist)) return candidateDist;

  const candidateSameDir = resolve(currentDir, 'worker.js');
  if (existsSync(candidateSameDir)) return candidateSameDir;

  return candidateDist;
}

export class ParallelFileScanner {
  public static async analyzeInParallel(options: ParallelScanOptions): Promise<WorkerBatchResult> {
    const { files, targetDir, config } = options;
    const workerCount = Math.min(options.maxWorkers || cpus().length || 4, files.length);

    if (workerCount <= 1 || files.length <= 1) {
      return ParallelFileScanner.analyzeSingleThread(files, targetDir, config, options.noCache);
    }

    // Enforce bounded batch size (max 500 files per worker chunk) to prevent V8 OOM
    const maxChunkSize = options.batchSize || 500;
    const chunkSize = Math.min(Math.ceil(files.length / workerCount), maxChunkSize);
    const chunks: string[][] = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }

    const workerScriptPath = getWorkerScriptPath();
    const workerPromises: Promise<WorkerBatchResult>[] = [];
    const execArgv = process.execArgv.length > 0 ? process.execArgv : undefined;

    for (const chunk of chunks) {
      const task: WorkerBatchTask = { files: chunk, config, targetDir, noCache: options.noCache };
      const promise = new Promise<WorkerBatchResult>((res, rej) => {
        const worker = new Worker(workerScriptPath, { workerData: task, execArgv });
        worker.on('message', (msg: WorkerBatchResult) => res(msg));
        worker.on('error', (err) => {
          console.error('Worker thread error:', err);
          rej(err);
        });
        worker.on('exit', (code) => {
          if (code !== 0) rej(new Error(`Worker stopped with exit code ${code}`));
        });
      });
      workerPromises.push(promise);
    }

    const results = await Promise.all(workerPromises);

    const aggregated: WorkerBatchResult = {
      fileReports: [],
      dynamicCandidates: [],
      totalTransformations: 0,
    };

    for (const r of results) {
      aggregated.totalTransformations += r.totalTransformations;
      aggregated.fileReports.push(...r.fileReports);
      aggregated.dynamicCandidates.push(...r.dynamicCandidates);
    }

    return aggregated;
  }

  private static analyzeSingleThread(
    files: string[],
    targetDir: string,
    config?: TailwindRefactorConfig,
    noCache?: boolean
  ): WorkerBatchResult {
    const resolver = createResolverForWorkspace(targetDir);
    const engine = new RefactorEngine({ resolver, config, noCache, cwd: targetDir });

    const result: WorkerBatchResult = {
      fileReports: [],
      dynamicCandidates: [],
      totalTransformations: 0,
    };

    for (const filePath of files) {
      try {
        const code = readFileSync(filePath, 'utf-8');
        const analysis = engine.analyzeCodeWithAnalysis(code, filePath);
        const relPath = relative(targetDir, filePath);

        if (analysis.transformations.length > 0) {
          result.totalTransformations += analysis.transformations.length;
          result.fileReports.push({
            file: relPath,
            fullPath: filePath,
            transformations: analysis.transformations,
          });
        }

        for (const dyn of analysis.dynamicCandidates) {
          result.dynamicCandidates.push({
            file: relPath,
            line: dyn.line,
            expression: dyn.expression,
            reason: dyn.reason,
          });
        }
      } catch {
        // Skip single file error
      }
    }

    return result;
  }
}
