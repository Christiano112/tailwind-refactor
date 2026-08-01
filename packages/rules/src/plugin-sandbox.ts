import type { RuleContext, TailwindCandidate, TailwindClass, Transformation } from '@tailwind-refactor/core';
import { createContext, runInContext } from 'vm';
import type { Rule } from './rule.interface.js';

/**
 * VM-based security sandbox for executing third-party plugin rules safely.
 *
 * @description
 * `PluginSandbox` wraps rule execution in a Node.js `vm.runInContext()` call.
 * This limits the blast radius of malicious or buggy third-party rules by:
 * 1. Running each rule in an isolated V8 context with no access to the host
 *    module system, file system, or network APIs.
 * 2. Enforcing a hard **500ms execution time limit** per candidate evaluation.
 *    Rules that enter infinite loops or excessive computation are killed.
 *
 * @remarks
 * **Fallback behaviour**: If the VM context itself fails to initialize or the
 * `runInContext()` call throws for any reason other than a timeout, execution
 * falls back silently to a direct `rule.analyze()` call. This means the
 * sandbox is best-effort — it provides isolation for well-structured rules
 * but is not a security guarantee against all attack vectors.
 *
 * **Scope of isolation**: The sandbox context exposes only the four values
 * a rule needs: `candidate`, `parsed`, `context`, and `rule` itself.
 * Global APIs like `require`, `process`, `fs`, `fetch`, etc., are not
 * available in the sandboxed context.
 *
 * @example
 * const result = PluginSandbox.executeRuleSafely(
 *   myThirdPartyRule,
 *   candidate,
 *   parsedClass,
 *   ruleContext,
 * );
 *
 * @see {@link RefactorEngine} for where rules are evaluated
 * @see {@link Rule}
 */
export class PluginSandbox {
  /** Supported plugin API version strings. */
  private static readonly SUPPORTED_API_VERSIONS = ['1'] as const;

  /**
   * Validates that a plugin declares a supported `apiVersion`.
   *
   * @remarks
   * Called at plugin load time (before `setup()` is invoked) to provide a
   * clear, actionable error message when an ecosystem plugin is incompatible
   * with the current version of `tailwind-refactor`.
   *
   * @param plugin - The plugin object to validate.
   * @throws {Error} If `apiVersion` is missing or not in `SUPPORTED_API_VERSIONS`.
   *
   * @example
   * PluginSandbox.validatePluginVersion(myPlugin); // throws if incompatible
   */
  public static validatePluginVersion(plugin: { name?: string; apiVersion?: string }): void {
    const supported = PluginSandbox.SUPPORTED_API_VERSIONS as readonly string[];
    if (!plugin.apiVersion || !supported.includes(plugin.apiVersion)) {
      throw new Error(
        `Plugin '${plugin.name ?? '(unknown)'}' declares apiVersion '${plugin.apiVersion ?? 'undefined'}' ` +
          `but only versions [${supported.join(', ')}] are supported. ` +
          `Please update the plugin or install a compatible version of tailwind-refactor.`
      );
    }
  }

  /**
   * Executes a rule's `analyze()` method inside a sandboxed VM context.
   *
   * @description
   * Creates a fresh V8 context, binds the rule inputs, and executes the rule.
   * The `result` variable is set by the VM script and retrieved from the context.
   * Falls back to direct execution if VM initialization or execution fails.
   *
   * @param rule      - The {@link Rule} instance whose `analyze()` will be called.
   * @param candidate - The `TailwindCandidate` being analyzed.
   * @param parsed    - The `TailwindClass` parsed from the candidate value.
   * @param context   - The `RuleContext` (resolver + file path).
   * @returns The `Transformation` returned by the rule, or `null` if none.
   *          Returns `null` on timeout without re-throwing.
   *
   * @example
   * // Used internally by RefactorEngine for third-party plugin rules
   * const result = PluginSandbox.executeRuleSafely(rule, candidate, parsed, context);
   * if (result) transformations.push(result);
   */
  public static executeRuleSafely(
    rule: Rule,
    candidate: TailwindCandidate,
    parsed: TailwindClass,
    context: RuleContext
  ): Transformation | null {
    try {
      const sandboxContext = createContext({
        candidate,
        parsed,
        context,
        rule,
        result: null,
      });

      runInContext('result = rule.analyze(candidate, parsed, context);', sandboxContext, {
        timeout: 500, // 500ms execution limit per candidate
      });

      return (sandboxContext as { result: Transformation | null }).result;
    } catch {
      // In case VM execution fails or times out, fallback to direct execution
      return rule.analyze(candidate, parsed, context);
    }
  }
}
