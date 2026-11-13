import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { decodePayload, encodePayload, errorResult, pluginField, pluginPort } from './shared';

export function createTcpPlugin(): WorkflowPlugin {
    return {
        id: 'tcp',
        name: 'TCP',
        description: 'Send a TCP message and optionally wait for a reply',
        version: '1.0.0',
        nodes: [{
            type: 'tcp-request',
            label: 'TCP request',
            description: 'Connect to a TCP server, send data and optionally wait for a reply',
            category: 'action',
            icon: '⇄',
            color: '#0891b2',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [
                pluginPort('out', 'out', 'output', 'Reply'),
                pluginPort('error', 'error', 'output', 'Error')
            ],
            fields: [
                pluginField({ key: 'host', label: 'Host', type: 'text', required: true, defaultValue: '127.0.0.1', placeholder: '127.0.0.1' }),
                pluginField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 9000, min: 1, max: 65535, step: 1 }),
                pluginField({ key: 'payload', label: 'Payload', type: 'textarea', rows: 4, placeholder: 'message to send' }),
                pluginField({ key: 'waitForReply', label: 'Wait for reply', type: 'boolean', defaultValue: true }),
                pluginField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 30000, min: 0, step: 1000, unit: 'ms', group: 'Reliability' })
            ],
            defaultConfig: { host: '127.0.0.1', port: 9000, waitForReply: true, timeout: 30000 },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const net: any = await import('node:net');
                    const timeout = Math.max(0, Number(config.timeout) || 0);
                    const socket = net.connect({ host: String(config.host || '127.0.0.1'), port: Number(config.port) || 0 });
                    await new Promise<void>((resolve, reject) => {
                        socket.once('connect', () => resolve());
                        socket.once('error', (error: Error) => reject(error));
                    });
                    socket.write(encodePayload(config.payload));
                    let reply: any;
                    if (config.waitForReply === true) {
                        reply = await new Promise((resolve, reject) => {
                            let buffer = '';
                            const timer = timeout > 0
                                ? setTimeout(() => reject(new Error(`TCP reply timed out after ${timeout}ms`)), timeout)
                                : undefined;
                            const done = () => {
                                if (timer) {
                                    clearTimeout(timer);
                                }
                                resolve(decodePayload(buffer));
                            };
                            socket.on('data', (chunk: any) => {
                                buffer += chunk?.toString ? chunk.toString() : String(chunk);
                            });
                            socket.once('end', done);
                            socket.once('close', done);
                            socket.once('error', (error: Error) => {
                                if (timer) {
                                    clearTimeout(timer);
                                }
                                reject(error);
                            });
                        });
                    }
                    socket.end();
                    return { success: true, data: { nodeId: node.id, reply } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
