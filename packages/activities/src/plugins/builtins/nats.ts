import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { decodePayload, errorResult, payloadBytes, pluginField, pluginPort } from './shared';

class NatsService {
    private connections = new Map<string, any>();

    async publish(servers: string, subject: string, payload: any): Promise<any> {
        const nc = await this.connection(servers);
        nc.publish(subject, payloadBytes(payload));
        await nc.flush();
        return { subject };
    }

    async request(servers: string, subject: string, payload: any, timeout = 30000): Promise<any> {
        const nc = await this.connection(servers);
        const response = await nc.request(subject, payloadBytes(payload), { timeout: Math.max(0, timeout) });
        return { subject, payload: decodePayload(response?.data) };
    }

    async dispose(): Promise<void> {
        const connections = [...this.connections.values()];
        this.connections.clear();
        for (const nc of connections) {
            try { await nc.drain(); } catch { try { await nc.close(); } catch { /* ignore */ } }
        }
    }

    private async connection(servers: string): Promise<any> {
        const key = servers || 'nats://localhost:4222';
        const existing = this.connections.get(key);
        if (existing) {
            return existing;
        }
        const module: any = await import('nats');
        const nc = await module.connect({ servers: key.split(',').map(item => item.trim()).filter(Boolean) });
        this.connections.set(key, nc);
        return nc;
    }
}

function createNatsService() {
    return { nats: new NatsService() };
}

function commonFields() {
    return [
        pluginField({ key: 'servers', label: 'NATS servers', labelZh: 'NATS 服务地址', type: 'text', defaultValue: 'nats://localhost:4222', required: true }),
        pluginField({ key: 'subject', label: 'Subject', labelZh: '主题', type: 'text', required: true }),
        pluginField({ key: 'payload', label: 'Payload', labelZh: '消息内容', type: 'json', defaultValue: {} }),
        pluginField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 30000, min: 0, step: 1000, group: 'Reliability', groupZh: '可靠性' })
    ];
}

export function createNatsPlugin(): WorkflowPlugin {
    return {
        id: 'nats',
        name: 'NATS',
        description: 'Publish and request NATS messages',
        version: '1.0.0',
        services: createNatsService,
        nodes: [{
            type: 'nats-publish',
            label: 'NATS publish',
            labelZh: 'NATS 发布',
            description: 'Publish a message to a NATS subject',
            descriptionZh: '向 NATS 主题发布消息',
            category: 'action',
            icon: '↗',
            color: '#0ea5e9',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Output'), pluginPort('error', 'error', 'output', 'Error')],
            fields: commonFields(),
            defaultConfig: { servers: 'nats://localhost:4222', payload: {} },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const result = await services.nats.publish(
                        String(config.servers || 'nats://localhost:4222'),
                        String(config.subject || ''),
                        config.payload
                    );
                    return { success: true, data: { nodeId: node.id, ...result } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }, {
            type: 'nats-request',
            label: 'NATS request',
            labelZh: 'NATS 请求',
            description: 'Send a NATS request and wait for a reply',
            descriptionZh: '发送 NATS 请求并等待回复',
            category: 'action',
            icon: '↔',
            color: '#0ea5e9',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Reply'), pluginPort('error', 'error', 'output', 'Timeout')],
            fields: commonFields(),
            defaultConfig: { servers: 'nats://localhost:4222', payload: {}, timeout: 30000 },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const result = await services.nats.request(
                        String(config.servers || 'nats://localhost:4222'),
                        String(config.subject || ''),
                        config.payload,
                        Number(config.timeout) || 30000
                    );
                    return { success: true, data: { nodeId: node.id, ...result } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
