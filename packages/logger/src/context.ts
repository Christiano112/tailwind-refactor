import type { ToolError } from './errors.js';

export interface DebugContext {
  filesScanned: number;
  filesIgnored: number;
  classesFound: number;
  transformationsGenerated: number;
  resolverStats: Record<string, number>;
  ruleStats: Record<string, number>;
  errors: ToolError[];
  startTime: number;
  endTime?: number;
}

export class DebugContextCollector {
  private context: DebugContext;

  constructor() {
    this.context = {
      filesScanned: 0,
      filesIgnored: 0,
      classesFound: 0,
      transformationsGenerated: 0,
      resolverStats: {},
      ruleStats: {},
      errors: [],
      startTime: Date.now(),
    };
  }

  public recordFileScanned(): void {
    this.context.filesScanned++;
  }

  public recordFileIgnored(): void {
    this.context.filesIgnored++;
  }

  public recordClassesFound(count: number): void {
    this.context.classesFound += count;
  }

  public recordTransformation(ruleName: string): void {
    this.context.transformationsGenerated++;
    this.context.ruleStats[ruleName] = (this.context.ruleStats[ruleName] || 0) + 1;
  }

  public recordResolverLookup(utility: string): void {
    this.context.resolverStats[utility] = (this.context.resolverStats[utility] || 0) + 1;
  }

  public recordError(error: ToolError): void {
    this.context.errors.push(error);
  }

  public finish(): DebugContext {
    this.context.endTime = Date.now();
    return this.context;
  }

  public getContext(): DebugContext {
    return this.context;
  }
}
