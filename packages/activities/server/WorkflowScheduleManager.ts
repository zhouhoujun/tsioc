import { Injectable, OnDestroy } from '@tsdi/ioc';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import {
    WorkflowScheduleHandle,
    WorkflowScheduleOptions
} from '../src/visual/workflow-scheduler';

export interface WorkflowScheduleStatus {
    workflowId: string;
    running: boolean;
    startedAt: number;
    runs: number;
}

interface ScheduleEntry {
    handle: WorkflowScheduleHandle;
    startedAt: number;
    runs: number;
    options: WorkflowScheduleOptions;
}

/**
 * Host-side scheduler for deployed workflows.
 *
 * The HTTP server exposes start/stop/status endpoints and keeps the in-process
 * handle so interval/cron/once inject triggers keep running after the request
 * returns. Finished handles keep their run counter for status queries.
 */
@Injectable()
export class WorkflowScheduleManager implements OnDestroy {
    private readonly entries = new Map<string, ScheduleEntry>();

    constructor(private readonly service: VisualWorkflowService) { }

    start(
        workflowId: string,
        definition: VisualWorkflowDefinition,
        options: WorkflowScheduleOptions = {}
    ): WorkflowScheduleStatus {
        this.stop(workflowId);
        const entry: ScheduleEntry = {
            startedAt: Date.now(),
            runs: 0,
            options,
            handle: undefined as unknown as WorkflowScheduleHandle
        };
        entry.handle = this.service.startSchedule(definition, {
            ...options,
            onResult: result => {
                entry.runs += 1;
                options.onResult?.(result);
            }
        });
        this.entries.set(workflowId, entry);
        return this.statusFor(workflowId);
    }

    /** Restart a running schedule with an edited definition, keeping counters. */
    restart(workflowId: string, definition: VisualWorkflowDefinition): WorkflowScheduleStatus | undefined {
        const existing = this.entries.get(workflowId);
        if (!existing) {
            return undefined;
        }
        const runs = existing.runs;
        const startedAt = existing.startedAt;
        const status = this.start(workflowId, definition, existing.options);
        const entry = this.entries.get(workflowId);
        if (entry) {
            entry.runs = runs;
            entry.startedAt = startedAt;
        }
        return status;
    }

    stop(workflowId: string): boolean {
        const entry = this.entries.get(workflowId);
        if (!entry) {
            return false;
        }
        try {
            entry.handle.stop();
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

    stopAll(): void {
        for (const id of [...this.entries.keys()]) {
            this.stop(id);
        }
    }

    onDestroy(): void {
        this.stopAll();
    }

    private statusFor(workflowId: string): WorkflowScheduleStatus {
        const entry = this.entries.get(workflowId)!;
        return {
            workflowId,
            running: entry.handle.running,
            startedAt: entry.startedAt,
            runs: entry.runs
        };
    }
}
