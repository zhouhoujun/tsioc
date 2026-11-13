import type { ActivityContext, ActivityResult } from '../activities/Activity';
import type { VisualWorkflowDefinition, WorkflowExecutionOptions } from './types';
import type { VisualWorkflowService } from './VisualWorkflowService';
import { nextCronTime } from './workflow-cron';

export interface WorkflowScheduleOptions {
    context?: ActivityContext;
    execution?: WorkflowExecutionOptions;
    onResult?: (result: ActivityResult) => void;
    onError?: (error: Error) => void;
}

export interface WorkflowScheduleHandle {
    readonly running: boolean;
    stop(): void;
}

interface TriggerPlan {
    mode: 'once' | 'interval' | 'cron';
    delayMs: number;
    intervalMs: number;
    repeatCount: number;
    cron?: string;
}

function unitFactor(unit: string): number {
    return unit === 'min' ? 60000 : unit === 'ms' ? 1 : 1000;
}

/**
 * Host-side scheduler for inject triggers.
 *
 * The execution service runs one flow cycle; the scheduler decides when to
 * start those cycles for interval/once injection. Event injection is handled by
 * the inject node itself through the host event bus.
 */
export class WorkflowScheduler {
    constructor(private readonly service: VisualWorkflowService) { }

    start(definition: VisualWorkflowDefinition, options: WorkflowScheduleOptions = {}): WorkflowScheduleHandle {
        let stopped = false;
        let running = false;
        let runs = 0;
        const timers = new Set<ReturnType<typeof setTimeout>>();

        const runOnce = async (): Promise<void> => {
            if (stopped || running) {
                return;
            }
            running = true;
            try {
                const result = await this.service.execute(
                    definition,
                    options.context || {},
                    options.execution
                );
                options.onResult?.(result);
            } catch (error) {
                options.onError?.(error as Error);
            } finally {
                running = false;
            }
        };

        const trigger = definition.nodes.find(node => {
            const mode = String(node.config?.trigger || 'manual');
            return node.type === 'inject' && (mode === 'interval' || mode === 'once' || mode === 'cron');
        });

        if (!trigger) {
            void runOnce();
            return {
                get running(): boolean { return !stopped; },
                stop(): void {
                    stopped = true;
                }
            };
        }

        const config = trigger.config || {};
        const mode = String(config.trigger || 'manual');
        const delayMs = Math.max(0, Number(config.onceDelay) || 0) * 1000;
        const intervalMs = Math.max(1, (Number(config.interval) || 1) * unitFactor(String(config.intervalUnit || 's')));
        const repeatCount = Math.max(0, Number(config.repeatCount) || 0);
        const plan: TriggerPlan = {
            mode: mode === 'interval' ? 'interval' : mode === 'cron' ? 'cron' : 'once',
            delayMs,
            intervalMs,
            repeatCount,
            cron: String(config.cron || '').trim()
        };

        const finish = (): void => {
            if (plan.repeatCount > 0 && runs >= plan.repeatCount) {
                stopped = true;
                for (const timer of timers) {
                    clearTimeout(timer);
                }
                timers.clear();
            }
        };

        const scheduleInterval = (): void => {
            const tick = (): void => {
                if (stopped) {
                    return;
                }
                runs += 1;
                void runOnce();
                finish();
                if (!stopped) {
                    const timer = setTimeout(tick, plan.intervalMs);
                    timers.add(timer);
                }
            };
            const timer = setTimeout(tick, plan.delayMs || plan.intervalMs);
            timers.add(timer);
        };

        const scheduleCron = (): void => {
            if (stopped) {
                return;
            }
            let next: Date | undefined;
            try {
                next = nextCronTime(plan.cron || '');
            } catch (error) {
                stopped = true;
                options.onError?.(error as Error);
                return;
            }
            if (!next) {
                stopped = true;
                options.onError?.(new Error('Cron expression never fires'));
                return;
            }
            const wait = Math.max(0, next.getTime() - Date.now());
            const capped = Math.min(wait, 2_147_483_647);
            const timer = setTimeout(() => {
                if (stopped) {
                    return;
                }
                if (capped < wait) {
                    scheduleCron();
                    return;
                }
                runs += 1;
                void runOnce();
                finish();
                if (!stopped) {
                    scheduleCron();
                }
            }, capped);
            timers.add(timer);
        };

        if (plan.mode === 'interval') {
            scheduleInterval();
        } else if (plan.mode === 'cron') {
            scheduleCron();
        } else {
            const timer = setTimeout(() => {
                runs += 1;
                void runOnce();
                finish();
            }, plan.delayMs);
            timers.add(timer);
        }

        return {
            get running(): boolean { return !stopped; },
            stop(): void {
                stopped = true;
                for (const timer of timers) {
                    clearTimeout(timer);
                }
                timers.clear();
            }
        };
    }
}
