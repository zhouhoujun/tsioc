import * as path from 'path';
import { watch, FSWatcher } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';

interface WatchEventRecord {
    type: string;
    path?: string;
    timestamp: number;
}

interface WatchState {
    id: string;
    path: string;
    absolutePath: string;
    watcher: FSWatcher;
    events: WatchEventRecord[];
    createdAt: number;
}

const watchRegistry = new Map<string, WatchState>();

@Injectable()
export class WatchFilesTool implements AgentTool {
    name = 'watch_files';
    description = 'Watch a workspace file or directory for changes and poll recorded events.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['start', 'list', 'poll', 'stop']
            },
            path: {
                type: 'string',
                description: 'Workspace path to watch when starting a watch.'
            },
            watch_id: {
                type: 'string',
                description: 'Watch identifier for poll and stop actions.'
            }
        },
        required: ['action']
    };
    toolset = 'filesystem';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = this.requireAction(input?.action);
        switch (action) {
            case 'start':
                return this.startWatch(input?.path);
            case 'list':
                return this.listWatches();
            case 'poll':
                return this.pollWatch(input?.watch_id);
            case 'stop':
                return this.stopWatch(input?.watch_id);
        }
    }

    private async startWatch(targetPath: unknown): Promise<any> {
        const requestedPath = this.requirePath(targetPath);
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);
        const watchId = this.createWatchId(absolutePath);
        const events: WatchEventRecord[] = [];
        const watcher = watch(absolutePath, { persistent: true }, (eventType, filename) => {
            events.push({
                type: eventType,
                path: filename == null ? undefined : String(filename),
                timestamp: Date.now()
            });
        });

        const state: WatchState = {
            id: watchId,
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            absolutePath,
            watcher,
            events,
            createdAt: Date.now()
        };
        watchRegistry.set(watchId, state);

        watcher.once('error', error => {
            state.events.push({
                type: 'error',
                path: error.message,
                timestamp: Date.now()
            });
        });

        return {
            watchId,
            path: state.path,
            active: true,
            createdAt: state.createdAt
        };
    }

    private listWatches(): any {
        return {
            total: watchRegistry.size,
            watches: Array.from(watchRegistry.values()).map(state => ({
                watchId: state.id,
                path: state.path,
                active: true,
                createdAt: state.createdAt,
                pendingEvents: state.events.length
            }))
        };
    }

    private pollWatch(watchIdValue: unknown): any {
        const watchId = this.requireWatchId(watchIdValue);
        const state = this.requireState(watchId);
        const events = state.events.splice(0, state.events.length);
        return {
            watchId: state.id,
            path: state.path,
            events
        };
    }

    private stopWatch(watchIdValue: unknown): any {
        const watchId = this.requireWatchId(watchIdValue);
        const state = this.requireState(watchId);
        state.watcher.close();
        watchRegistry.delete(watchId);
        return {
            watchId,
            path: state.path,
            stopped: true
        };
    }

    private requireState(watchId: string): WatchState {
        const state = watchRegistry.get(watchId);
        if (!state) {
            throw new Error(`Unknown watch id '${watchId}'.`);
        }
        return state;
    }

    private createWatchId(absolutePath: string): string {
        return `watch-${path.basename(absolutePath)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    private requireAction(value: unknown): 'start' | 'list' | 'poll' | 'stop' {
        const action = this.requireString(value, 'watch_files action');
        if (!['start', 'list', 'poll', 'stop'].includes(action)) {
            throw new Error("Invalid watch_files action: must be one of start, list, poll, stop.");
        }
        return action as 'start' | 'list' | 'poll' | 'stop';
    }

    private requireWatchId(value: unknown): string {
        return this.requireString(value, 'watch_files watch_id');
    }

    private requirePath(value: unknown): string {
        return this.requireString(value, 'watch_files path');
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
