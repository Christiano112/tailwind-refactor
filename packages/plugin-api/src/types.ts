/**
 * @fileoverview Public Plugin API contracts for the tailwind-refactor ecosystem.
 *
 * @remarks
 * This file is now a **re-export barrel**. The actual type definitions have been
 * split into focused domain modules:
 *
 * - `config.ts`         — `BaseRefactorConfig`, `PluginConfigShape`
 * - `diagnostic.ts`     — `Diagnostic`, `Severity`
 * - `transformation.ts` — `Transformation`, `Confidence`, `ScanResult`, `FixResult`
 * - `workspace.ts`      — `Workspace`
 * - `rule.ts`           — `PluginRule`, `PluginContext`, `PluginRuleContext`, `PluginLogger`, `PluginCandidateShape`, `PluginClassShape`, `ResolutionResult`
 * - `plugin.ts`         — `TailwindRefactorPlugin`
 *
 * Importing from `@tailwind-refactor/plugin-api` continues to work unchanged.
 * All types are re-exported here for zero-friction backwards compatibility.
 *
 * @module @tailwind-refactor/plugin-api
 */

export type { BaseRefactorConfig, PluginConfigShape } from './config.js';
export type { Diagnostic, Severity } from './diagnostic.js';
export type {
  Confidence,
  FixResult,
  ScanResult,
  Transformation,
} from './transformation.js';
export type { Workspace } from './workspace.js';
export type {
  PluginCandidateShape,
  PluginClassShape,
  PluginContext,
  PluginLogger,
  PluginRule,
  PluginRuleContext,
  ResolutionResult,
} from './rule.js';
export type { TailwindRefactorPlugin } from './plugin.js';
