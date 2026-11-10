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
            type: 'redis-command',
            label: 'Redis command',
            labelZh: 'Redis 命令',
            description: 'Run a Redis command and return its result',
            descriptionZh: '执行 Redis 命令并返回结果',
            category: 'action',
            icon: '⌘',
            color: '#dc2626',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Result'), pluginPort('error', 'error', 'output', 'Error')],
            fields: [
                pluginField({ key: 'url', label: 'Redis URL', labelZh: 'Redis 地址', type: 'text', defaultValue: 'redis://127.0.0.1:6379', required: true }),
                pluginField({ key: 'command', label: 'Command', labelZh: '命令', type: 'text', defaultValue: 'GET', required: true }),
                pluginField({ key: 'args', label: 'Arguments', labelZh: '参数', type: 'json', defaultValue: [], description: 'JSON array of command arguments.', descriptionZh: '命令参数的 JSON 数组。' })
            ],
            defaultConfig: { url: 'redis://127.0.0.1:6379', command: 'GET', args: [] },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const args = Array.isArray(config.args) ? config.args : [];
                    const result = await services.redis.command(
                        String(config.url || 'redis://127.0.0.1:6379'),
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
            labelZh: 'Redis 发布',
            description: 'Publish a message to a Redis channel',
            descriptionZh: '向 Redis 频道发布消息',
            category: 'action',
            icon: '↗',
            color: '#dc2626',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Output'), pluginPort('error', 'error', 'output', 'Error')],
            fields: [
                pluginField({ key: 'url', label: 'Redis URL', labelZh: 'Redis 地址', type: 'text', defaultValue: 'redis://127.0.0.1:6379', required: true }),
                pluginField({ key: 'channel', label: 'Channel', labelZh: '频道', type: 'text', required: true }),
                pluginField({ key: 'message', label: 'Message', labelZh: '消息', type: 'json', defaultValue: {} })
            ],
            defaultConfig: { url: 'redis://127.0.0.1:6379', message: {} },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const receivers = await services.redis.publish(
                        String(config.url || 'redis://127.0.0.1:6379'),
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
