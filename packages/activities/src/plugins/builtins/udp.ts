import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { decodePayload, encodePayload, errorResult, pluginField, pluginPort } from './shared';
import { resolveUdpConfig } from '../../visual/workflow-runtime';

export function createUdpPlugin(): WorkflowPlugin {
    return {
        id: 'udp',
        name: 'UDP',
        description: 'Send a UDP datagram and optionally wait for a reply',
        version: '1.0.0',
        nodes: [{
            type: 'udp-request',
            label: 'UDP request',
            description: 'Send a UDP datagram and optionally wait for a reply',
            category: 'action',
            icon: '⇄',
            color: '#7c3aed',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [
                pluginPort('out', 'out', 'output', 'Reply'),
                pluginPort('error', 'error', 'output', 'Error')
            ],
            fields: [
                pluginField({
                    key: 'udp',
                    label: 'Endpoint',
                    type: 'select',
                    reference: { kind: 'config-node', resource: 'udp-endpoint', create: true, edit: true }
                }),
                pluginField({ key: 'host', label: 'Host', type: 'text', required: true, defaultValue: '127.0.0.1', placeholder: '127.0.0.1', visibleWhen: { key: 'udp', equals: '' } }),
                pluginField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 9000, min: 1, max: 65535, step: 1, visibleWhen: { key: 'udp', equals: '' } }),
                pluginField({ key: 'broadcast', label: 'Broadcast', type: 'boolean', defaultValue: false, visibleWhen: { key: 'udp', equals: '' } }),
                pluginField({ key: 'payload', label: 'Payload', type: 'textarea', rows: 4, placeholder: 'datagram to send' }),
                pluginField({ key: 'waitForReply', label: 'Wait for reply', type: 'boolean', defaultValue: true }),
                pluginField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 30000, min: 0, step: 1000, unit: 'ms', group: 'Reliability' })
            ],
            defaultConfig: { udp: '', host: '127.0.0.1', port: 9000, broadcast: false, waitForReply: true, timeout: 30000 },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const dgram: any = await import('node:dgram');
                    const settings = await resolveUdpConfig(config, context);
                    const socket = dgram.createSocket('udp4');
                    if (settings.broadcast) {
                        socket.setBroadcast(true);
                    }
                    await new Promise<void>((resolve, reject) => {
                        socket.bind(() => resolve());
                        socket.once('error', (error: Error) => reject(error));
                    });
                    const timeout = Math.max(0, Number(config.timeout) || 0);
                    let waiting: Promise<any> | undefined;
                    if (config.waitForReply === true) {
                        waiting = new Promise((resolve, reject) => {
                            const timer = timeout > 0
                                ? setTimeout(() => reject(new Error(`UDP reply timed out after ${timeout}ms`)), timeout)
                                : undefined;
                            socket.once('message', (message: any) => {
                                if (timer) {
                                    clearTimeout(timer);
                                }
                                resolve(decodePayload(message?.toString ? message.toString() : message));
                            });
                            socket.once('error', (error: Error) => {
                                if (timer) {
                                    clearTimeout(timer);
                                }
                                reject(error);
                            });
                        });
                    }
                    await new Promise<void>((resolve, reject) => {
                        socket.send(
                            encodePayload(config.payload),
                            settings.port,
                            settings.host,
                            (error?: Error) => error ? reject(error) : resolve()
                        );
                    });
                    const reply = waiting ? await waiting : undefined;
                    socket.close();
                    return { success: true, data: { nodeId: node.id, reply } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
