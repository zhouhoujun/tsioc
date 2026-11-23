import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { errorResult, pluginField, pluginPort } from './shared';

class RedisService {
    private clients = new Map<string, any>();

    async command(url: string, command: string, args: any[] = []): Promise<any> {
        const client = await this.client(url);
        return client.call(command, ...args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)));
    }

    async publish(url: string, channel: string, message: any): Promise<any> {
        const client = await this.client(url);
        return client.publish(channel, typeof message === 'string' ? message : JSON.stringify(message));
    }

    async dispose(): Promise<void> {
        const clients = [...this.clients.values()];
        this.clients.clear();
        for (const client of clients) {
            try { await client.quit(); } catch { try { client.disconnect(); } catch { /* ignore */ } }
        }
    }

    private async client(url: string): Promise<any> {
        const existing = this.clients.get(url);
        if (existing) {
            return existing;
        }
        const module: any = await import('ioredis');
        const Redis = module.default ?? module;
        const client = new Redis(url || 'redis://127.0.0.1:6379');
        await new Promise<void>((resolve, reject) => {
            const onReady = () => { cleanup(); resolve(); };
            const onError = (error: Error) => { cleanup(); reject(error); };
            const cleanup = () => {
                client.off('ready', onReady);
                client.off('error', onError);
            };
            client.on('ready', onReady);
            client.on('error', onError);
        });
        this.clients.set(url, client);
        return client;
    }
}

function redisUrl(config: Record<string, any>, context: ActivityContext): string {
    const id = String(config.redis || '').trim();
    if (id) {
        const shared = (context as any)?.configNodes?.[id];
        if (!shared) {
            throw new Error(`Redis endpoint not found: ${id}. Add a redis endpoint config node or clear the reference.`);
        }
        return String(shared.url || 'redis://127.0.0.1:6379');
    }
    return String(config.url || 'redis://127.0.0.1:6379');
}

function createRedisService() {
    return { redis: new RedisService() };
}

export function createRedisPlugin(): WorkflowPlugin {
    return {
        id: 'redis',
        name: 'Redis',
        description: 'Run Redis commands and publish messages',
        version: '1.0.0',
        services: createRedisService,
        nodes: [{
            type: 'redis',
            label: 'Redis endpoint',
            description: 'Shared Redis connection for Redis nodes',
            category: 'advanced',
            configNode: true,
            resource: 'redis-endpoint',
            icon: '⌘',
            color: '#dc2626',
            textColor: '#ffffff',
            inputs: [],
            outputs: [],
            fields: [
                pluginField({ key: 'url', label: 'Redis URL', type: 'text', defaultValue: 'redis://127.0.0.1:6379', required: true })
            ],
            defaultConfig: { url: 'redis://127.0.0.1:6379' }
        }, {
            type: 'redis-command',
            label: 'Redis command',
            description: 'Run a Redis command and return its result',
            category: 'action',
            icon: '⌘',
            color: '#dc2626',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Result'), pluginPort('error', 'error', 'output', 'Error')],
            fields: [
                pluginField({
                    key: 'redis',
                    label: 'Endpoint',
                    type: 'select',
                    reference: { kind: 'config-node', resource: 'redis-endpoint', create: true, edit: true }
                }),
                pluginField({ key: 'url', label: 'Redis URL', type: 'text', defaultValue: 'redis://127.0.0.1:6379', required: true, visibleWhen: { key: 'redis', equals: '' } }),
                pluginField({ key: 'command', label: 'Command', type: 'text', defaultValue: 'GET', required: true }),
                pluginField({ key: 'args', label: 'Arguments', type: 'json', defaultValue: [], description: 'JSON array of command arguments.',})
            ],
            defaultConfig: { redis: '', url: 'redis://127.0.0.1:6379', command: 'GET', args: [] },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const args = Array.isArray(config.args) ? config.args : [];
                    const result = await services.redis.command(
                        redisUrl(config, context),
                        String(config.command || 'GET'),
                        args
                    );
                    return { success: true, data: { nodeId: node.id, result } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }, {
            type: 'redis-publish',
            label: 'Redis publish',
            description: 'Publish a message to a Redis channel',
            category: 'action',
            icon: '↗',
            color: '#dc2626',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Output'), pluginPort('error', 'error', 'output', 'Error')],
            fields: [
                pluginField({
                    key: 'redis',
                    label: 'Endpoint',
                    type: 'select',
                    reference: { kind: 'config-node', resource: 'redis-endpoint', create: true, edit: true }
                }),
                pluginField({ key: 'url', label: 'Redis URL', type: 'text', defaultValue: 'redis://127.0.0.1:6379', required: true, visibleWhen: { key: 'redis', equals: '' } }),
                pluginField({ key: 'channel', label: 'Channel', type: 'text', required: true }),
                pluginField({ key: 'message', label: 'Message', type: 'json', defaultValue: {} })
            ],
            defaultConfig: { redis: '', url: 'redis://127.0.0.1:6379', message: {} },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const receivers = await services.redis.publish(
                        redisUrl(config, context),
                        String(config.channel || ''),
                        config.message
                    );
                    return { success: true, data: { nodeId: node.id, receivers } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
