import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { decodePayload, encodePayload, errorResult, pluginField, pluginPort } from './shared';

class CoapService {
    async request(options: {
        host?: string;
        port?: number;
        method?: string;
        path?: string;
        payload?: any;
        timeout?: number;
    }): Promise<any> {
        const module: any = await import('coap');
        const coap = module.default ?? module;
        const payload = encodePayload(options.payload);
        return new Promise((resolve, reject) => {
            const request = coap.request({
                host: options.host || '127.0.0.1',
                port: Number(options.port) || 5683,
                method: String(options.method || 'GET').toUpperCase(),
                pathname: options.path || '/',
                payload: payload || undefined,
                confirmable: true
            });
            const timer = setTimeout(() => {
                try { request.abort?.(); } catch { /* ignore */ }
                reject(new Error(`CoAP request timed out after ${options.timeout}ms`));
            }, Math.max(0, Number(options.timeout) || 30000));
            request.on('response', (response: any) => {
                clearTimeout(timer);
                const chunks: Buffer[] = [];
                response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
                response.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    resolve({ code: response.code, payload: decodePayload(body) });
                });
                response.on('error', (error: Error) => {
                    clearTimeout(timer);
                    reject(error);
                });
            });
            request.on('error', (error: Error) => {
                clearTimeout(timer);
                reject(error);
            });
            request.end();
        });
    }

    async dispose(): Promise<void> { /* no persistent connections */ }
}

function createCoapService() {
    return { coap: new CoapService() };
}

export function createCoapPlugin(): WorkflowPlugin {
    return {
        id: 'coap',
        name: 'CoAP',
        description: 'Send CoAP requests',
        version: '1.0.0',
        services: createCoapService,
        nodes: [{
            type: 'coap-request',
            label: 'CoAP request',
            labelZh: 'CoAP 请求',
            description: 'Send a CoAP request and return the response payload',
            descriptionZh: '发送 CoAP 请求并返回响应内容',
            category: 'action',
            icon: '⇄',
            color: '#0f766e',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [pluginPort('out', 'out', 'output', 'Response'), pluginPort('error', 'error', 'output', 'Error')],
            fields: [
                pluginField({ key: 'host', label: 'Host', labelZh: '主机', type: 'text', defaultValue: '127.0.0.1', required: true }),
                pluginField({ key: 'port', label: 'Port', labelZh: '端口', type: 'number', defaultValue: 5683, min: 1, max: 65535, step: 1 }),
                pluginField({
                    key: 'method',
                    label: 'Method',
                    labelZh: '方法',
                    type: 'select',
                    defaultValue: 'GET',
                    options: ['GET', 'POST', 'PUT', 'DELETE'].map(value => ({ label: value, value }))
                }),
                pluginField({ key: 'path', label: 'Path', labelZh: '路径', type: 'text', defaultValue: '/' }),
                pluginField({ key: 'payload', label: 'Payload', labelZh: '请求内容', type: 'json', defaultValue: {} }),
                pluginField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 30000, min: 0, step: 1000, group: 'Reliability', groupZh: '可靠性' })
            ],
            defaultConfig: { host: '127.0.0.1', port: 5683, method: 'GET', path: '/', payload: {}, timeout: 30000 },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const services = (context as any).services || {};
                    const result = await services.coap.request(config);
                    return { success: true, data: { nodeId: node.id, ...result } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
