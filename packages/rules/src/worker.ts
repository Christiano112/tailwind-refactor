import type { TailwindRefactorConfig } from '@tailwind-refactor/config';
import type { Transformation } from '@tailwind-refactor/core';
import { createResolverForWorkspace } from '@tailwind-refactor/resolver';
import { readFileSync } from 'fs';
import { relative } from 'path';
import { parentPort, workerData } from 'worker_threads';
import { RefactorEngine } from './engine.js';

export interface WorkerBatchTask {
  files: string[];
  config?: TailwindRefactorConfig;
  targetDir: string;
  noCache?: boolean;
}

export interface WorkerBatchResult {
  fileReports: { file: string; fullPath: string; transformations: Transformation[] }[];
  dynamicCandidates: { file: string; line?: number; expression: string; reason?: string }[];
  totalTransformations: number;
}

async function runWorkerTask() {
  if (!parentPort || !workerData) return;

  const task = workerData as WorkerBatchTask;
  const { files, config, targetDir, noCache } = task;

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
      // Skip worker error on single file
    }
  }

  parentPort.postMessage(result);
  process.exit(0);
}

runWorkerTask();
