import { Injectable, OnDestroy } from '@tsdi/ioc';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { VisualWorkflowService, configNodeMap } from '../src/visual/VisualWorkflowService';
import {
    WorkflowScheduleHandle,
    WorkflowScheduleOptions
} from '../src/visual/workflow-scheduler';
import { WorkflowInboundHandle, WorkflowInboundRunner } from './WorkflowInboundRunner';

export interface WorkflowScheduleStatus {
    workflowId: string;
    running: boolean;
    startedAt: number;
    runs: number;
    /** Bound inbound ports (empty for inject-only deployments). */
    ports?: number[];
}

interface ScheduleEntry {
    /** Inject schedule (interval/once/cron); absent for inbound-only workflows. */
    schedule?: WorkflowScheduleHandle;
    /** Shared inbound listeners (tcp/udp/websocket/mqtt/watch). */
    inbound?: WorkflowInboundHandle;
    startedAt: number;
    runs: number;
    options: WorkflowScheduleOptions;
}

const INBOUND_NODE_TYPES = new Set(['tcp-in', 'udp-in', 'websocket-in', 'mqtt-in', 'watch', 'tail']);

/** A workflow deployable at startup: inject schedule or long-lived inbound listener. */
export function workflowHasScheduleTrigger(definition: VisualWorkflowDefinition | undefined): boolean {
    return (definition?.nodes || []).some(node => {
        if (node.type !== 'inject') {
            return false;
        }
        const trigger = String(node.config?.trigger || 'manual');
        return trigger === 'interval' || trigger === 'once' || trigger === 'cron';
    });
}

export function workflowHasInboundTriggers(definition: VisualWorkflowDefinition | undefined): boolean {
    return (definition?.nodes || []).some(node => INBOUND_NODE_TYPES.has(node.type));
}

/**
 * Host-side deployment manager.
 *
 * The HTTP server exposes start/stop/status endpoints and keeps the in-process
 * handles so inject schedules and inbound listeners survive the request. A
 * workflow may deploy both: inject triggers for polling and listeners for
 * webhooks/sockets.
 */
@Injectable()
export class WorkflowScheduleManager implements OnDestroy {
    private readonly entries = new Map<string, ScheduleEntry>();

    constructor(private readonly service: VisualWorkflowService) { }

    async start(
        workflowId: string,
        definition: VisualWorkflowDefinition,
        options: WorkflowScheduleOptions = {}
    ): Promise<WorkflowScheduleStatus> {
        await this.stop(workflowId);
        const entry: ScheduleEntry = {
            startedAt: Date.now(),
            runs: 0,
            options
        };
        const countRun = (result: any) => {
            entry.runs += 1;
            options.onResult?.(result);
        };
        try {
            if (workflowHasScheduleTrigger(definition)) {
                entry.schedule = this.service.startSchedule(definition, {
                    ...options,
                    onResult: countRun
                });
            }
            if (workflowHasInboundTriggers(definition)) {
                entry.inbound = await new WorkflowInboundRunner(this.service).start(definition, {
                    context: options.context,
                    execution: options.execution,
                    onResult: countRun,
                    onError: options.onError,
                    configNodes: configNodeMap(definition, type => this.service.getRegistry().get(type)?.configNode === true),
                    credentialResolver: name => this.service.resolveCredential(name),
                    workspaceRoot: (options.context as any)?.workspaceRoot
                });
            }
        } catch (error) {
            entry.schedule?.stop();
            await entry.inbound?.stop().catch(() => undefined);
            throw error;
        }
        this.entries.set(workflowId, entry);
        return this.statusFor(workflowId);
    }

    /** Restart a running deployment with an edited definition, keeping counters. */
    async restart(
        workflowId: string,
        definition: VisualWorkflowDefinition
    ): Promise<WorkflowScheduleStatus | undefined> {
        const existing = this.entries.get(workflowId);
        if (!existing) {
            return undefined;
        }
        const runs = existing.runs;
        const startedAt = existing.startedAt;
        const status = await this.start(workflowId, definition, existing.options);
        const entry = this.entries.get(workflowId);
        if (entry) {
            entry.runs = runs;
            entry.startedAt = startedAt;
        }
        return status;
    }

    async stop(workflowId: string): Promise<boolean> {
        const entry = this.entries.get(workflowId);
        if (!entry) {
            return false;
        }
        try {
            entry.schedule?.stop();
            await entry.inbound?.stop().catch(() => undefined);
        } finally {
            this.entries.delete(workflowId);
        }
        return true;
    }

    status(workflowId: string): WorkflowScheduleStatus | undefined {
        return this.entries.has(workflowId) ? this.statusFor(workflowId) : undefined;
    }

    list(): WorkflowScheduleStatus[] {
        return Array.from(this.entries.keys()).map(id => this.statusFor(id));
    }

    async stopAll(): Promise<void> {
        for (const id of [...this.entries.keys()]) {
            await this.stop(id);
        }
    }

    onDestroy(): void {
        void this.stopAll();
    }

    private statusFor(workflowId: string): WorkflowScheduleStatus {
        const entry = this.entries.get(workflowId)!;
        return {
            workflowId,
            running: !!(entry.schedule?.running || entry.inbound?.running),
            startedAt: entry.startedAt,
            runs: entry.runs,
            ports: entry.inbound?.ports ? [...entry.inbound.ports] : []
        };
    }
}
