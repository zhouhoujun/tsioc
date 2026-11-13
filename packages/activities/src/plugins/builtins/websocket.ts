import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { decodePayload, encodePayload, errorResult, pluginField, pluginPort } from './shared';

export function createWebSocketPlugin(): WorkflowPlugin {
    return {
        id: 'websocket',
        name: 'WebSocket',
        description: 'Send a message to a WebSocket endpoint and optionally wait for a reply',
        version: '1.0.0',
        nodes: [{
            type: 'websocket-request',
            label: 'WebSocket request',
            description: 'Send a WebSocket message and optionally wait for the reply',
            category: 'action',
            icon: '⇄',
            color: '#0ea5e9',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [
                pluginPort('out', 'out', 'output', 'Reply'),
                pluginPort('error', 'error', 'output', 'Error')
            ],
            fields: [
                pluginField({ key: 'url', label: 'URL', type: 'url', required: true, placeholder: 'wss://example.com/socket' }),
                pluginField({ key: 'headers', label: 'Headers', type: 'keyvalue', valueType: 'text', placeholder: 'Authorization' }),
                pluginField({ key: 'message', label: 'Message fields', type: 'json', defaultValue: {} }),
                pluginField({ key: 'waitForReply', label: 'Wait for reply', type: 'boolean', defaultValue: true }),
                pluginField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 30000, min: 0, step: 1000, unit: 'ms', group: 'Reliability' })
            ],
            defaultConfig: { message: {}, waitForReply: true, timeout: 30000 },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const module: any = await import('ws');
                    const WebSocket = module.WebSocket || module.default || module;
                    const socket = new WebSocket(String(config.url || ''), {
                        headers: config.headers && typeof config.headers === 'object' ? config.headers : undefined
                    });
                    await new Promise<void>((resolve, reject) => {
                        socket.once('open', () => resolve());
                        socket.once('error', (error: Error) => reject(error));
                    });
                    socket.send(encodePayload(config.message));
                    let reply: any;
                    if (config.waitForReply === true) {
                        const timeout = Math.max(0, Number(config.timeout) || 0);
                        reply = await new Promise((resolve, reject) => {
                            const timer = timeout > 0
                                ? setTimeout(() => reject(new Error(`WebSocket reply timed out after ${timeout}ms`)), timeout)
                                : undefined;
                            socket.once('message', (data: any) => {
                                if (timer) {
                                    clearTimeout(timer);
                                }
                                resolve(decodePayload(data?.toString ? data.toString() : data));
                            });
                            socket.once('error', (error: Error) => {
                                if (timer) {
                                    clearTimeout(timer);
                                }
                                reject(error);
                            });
                        });
                    }
                    socket.close();
                    return { success: true, data: { nodeId: node.id, reply } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
