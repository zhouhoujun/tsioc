import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { decodePayload, encodePayload, errorResult, pluginField, pluginPort } from './shared';

class MqttService {
    private clients = new Map<string, any>();

    async publish(url: string, topic: string, payload: any, qos = 0, retain = false): Promise<any> {
        const client = await this.client(url);
        await new Promise<void>((resolve, reject) => {
            client.publish(topic, encodePayload(payload), { qos, retain }, (error?: Error) => error ? reject(error) : resolve());
        });
        return { topic, qos, retain };
    }

    async waitFor(url: string, topic: string, timeout = 30000): Promise<any> {
        const client = await this.client(url);
        await new Promise<void>((resolve, reject) => {
            client.subscribe(topic, (error?: Error) => error ? reject(error) : resolve());
        });
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`MQTT wait timed out after ${timeout}ms`));
            }, Math.max(0, timeout));
            const onMessage = (received: string, payload: any) => {
                if (received !== topic) {
                    return;
                }
                cleanup();
                resolve({ topic: received, payload: decodePayload(payload) });
            };
            const onError = (error: Error) => {
                cleanup();
                reject(error);
            };
            const cleanup = () => {
                clearTimeout(timer);
                client.off('message', onMessage);
                client.off('error', onError);
                client.unsubscribe(topic).catch(() => undefined);
            };
            client.on('message', onMessage);
            client.on('error', onError);
        });
    }

    async dispose(): Promise<void> {
        const clients = [...this.clients.values()];
        this.clients.clear();
        for (const client of clients) {
            try {
                await new Promise<void>(resolve => client.end(false, () => resolve()));
            } catch {
                try { client.end(true); } catch { /* ignore */ }
            }
        }
    }

    private async client(url: string): Promise<any> {
        const existing = this.clients.get(url);
        if (existing) {
            return existing;
        }
        const module: any = await import('mqtt');
        const mqtt = module.default ?? module;
        const client = mqtt.connect(url);
        await new Promise<void>((resolve, reject) => {
            const onConnect = () => { cleanup(); resolve(); };
            const onError = (error: Error) => { cleanup(); reject(error); };
            const cleanup = () => {
                client.off('connect', onConnect);
                client.off('error', onError);
            };
            client.on('connect', onConnect);
            client.on('error', onError);
        });
        this.clients.set(url, client);
        return client;
    }
}

function commonFields() {
    return [
        pluginField({ key: 'url', label: 'Broker URL', labelZh: 'Broker 地址', type: 'text', defaultValue: 'mqtt://localhost:1883', required: true }),
        pluginField({ key: 'topic', label: 'Topic', labelZh: '主题', type: 'text', required: true }),
        pluginField({ key: 'qos', label: 'QoS', labelZh: 'QoS', type: 'number', defaultValue: 0, min: 0, max: 2, step: 1 }),
        pluginField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 30000, min: 0, step: 1000, group: 'Reliability', groupZh: '可靠性' })
    ];
}

function createMqttService() {
    return { mqtt: new MqttService() };
}

export function createMqttPlugin(): WorkflowPlugin {
    return {
        id: 'mqtt',
        name: 'MQTT',
        description: 'Publish, subscribe and wait for MQTT messages',
        version: '1.0.0',
        services: createMqttService,
        nodes: [{
            type: 'mqtt-publish',
            label: 'MQTT publish',
            labelZh: 'MQTT 发布',
            description: 'Publish a message to an MQTT topic',
            descriptionZh: '向 MQTT 主题发布消息',
            category: 'action',
            icon: '↗',
            color: '#7c3aed',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Output'), pluginPort('error', 'error', 'output', 'Error')],
            fields: [
                ...commonFields(),
                pluginField({ key: 'payload', label: 'Payload', labelZh: '消息内容', type: 'json', defaultValue: {} }),
                pluginField({ key: 'retain', label: 'Retain', labelZh: '保留消息', type: 'boolean', defaultValue: false })
            ],
            defaultConfig: { url: 'mqtt://localhost:1883', qos: 0, retain: false, payload: {} },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const result = await services.mqtt.publish(
                        String(config.url || 'mqtt://localhost:1883'),
                        String(config.topic || ''),
                        config.payload,
                        Number(config.qos) || 0,
                        config.retain === true
                    );
                    return { success: true, data: { nodeId: node.id, ...result } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }, {
            type: 'mqtt-wait',
            label: 'MQTT wait',
            labelZh: 'MQTT 等待',
            description: 'Wait for the next message on an MQTT topic',
            descriptionZh: '等待 MQTT 主题的下一条消息',
            category: 'action',
            icon: '↘',
            color: '#7c3aed',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Message'), pluginPort('error', 'error', 'output', 'Timeout')],
            fields: commonFields(),
            defaultConfig: { url: 'mqtt://localhost:1883', qos: 0, timeout: 30000 },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const message = await services.mqtt.waitFor(
                        String(config.url || 'mqtt://localhost:1883'),
                        String(config.topic || ''),
                        Number(config.timeout) || 30000
                    );
                    return { success: true, data: { nodeId: node.id, ...message } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
