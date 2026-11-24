import type { ActivityContext, ActivityResult } from '../../activities/Activity';
import type { IVisualWorkflowNode } from '../types';
import { coerceJson, resolveCredentialValue, resolveWorkflowValueAsync } from './values';
import { resolveHttpConfig } from './network-config';
import type { WorkflowHttpEndpointSettings } from './network-config';

/** Request body: strings pass through, objects from expressions are JSON. */
async function resolveRequestBody(body: any, context: ActivityContext): Promise<string | undefined> {
    if (body === undefined || body === null || body === '') {
        return undefined;
    }
    const resolved = await resolveWorkflowValueAsync(body, context);
    if (resolved === undefined || resolved === null || resolved === '') {
        return undefined;
    }
    return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
}

export async function runHttp(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
    let endpoint: WorkflowHttpEndpointSettings;
    try {
        endpoint = await resolveHttpConfig(config, context);
    } catch (error) {
        return { success: false, error: error as Error, data: { nodeId: node.id } };
    }
    const resolvedUrl = await resolveWorkflowValueAsync(config.url, context);
    const rawUrl = typeof config.url === 'string' ? config.url.trim() : '';
    // Literal endpoints must not be mistaken for dotted context paths.
    let url = resolvedUrl || (/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : resolvedUrl);
    if (endpoint.baseUrl) {
        if (rawUrl && /^[a-z][a-z0-9+.-]*:/i.test(rawUrl)) {
            url = rawUrl;
        } else if (rawUrl) {
            try {
                url = new URL(rawUrl, endpoint.baseUrl.endsWith('/') ? endpoint.baseUrl : `${endpoint.baseUrl}/`).toString();
            } catch {
                url = `${endpoint.baseUrl.replace(/\/$/, '')}/${rawUrl.replace(/^\//, '')}`;
            }
        } else {
            url = endpoint.baseUrl;
        }
    }
    if (url && endpoint.query && Object.keys(endpoint.query).length) {
        try {
            const parsed = new URL(String(url));
            Object.entries(endpoint.query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    parsed.searchParams.set(key, String(value));
                }
            });
            url = parsed.toString();
        } catch {
            // Relative/unparseable URLs keep their original form.
        }
    }
    // Node-RED `paytoqs`: append an object payload to the URL as query
    // parameters instead of sending it as the body.
    if (config.paytoqs === true && url) {
        const payload = (context as any).msg?.payload ?? (context as any).payload;
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            const search = Object.entries(payload)
                .filter(([, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
                .join('&');
            if (search) {
                url = `${url}${String(url).includes('?') ? '&' : '?'}${search}`;
            }
        }
    }
    if (!url) {
        return {
            success: false,
            error: new Error('HTTP request URL is required. Set the URL field or point it at a context value.'),
            data: { nodeId: node.id }
        };
    }
    const fetchImpl = (globalThis as any).fetch;
    if (typeof fetchImpl !== 'function') {
        return {
            success: false,
            error: new Error('fetch is not available in this runtime'),
            data: { nodeId: node.id }
        };
    }
    try {
        const nodeHeaders = coerceJson(config.headers);
        const headers: Record<string, any> = {
            ...(endpoint.headers || {}),
            ...(nodeHeaders && typeof nodeHeaders === 'object' && !Array.isArray(nodeHeaders) ? nodeHeaders : {})
        };
        const authType = endpoint.endpointId ? endpoint.authType : String(config.authType || 'none');
        if (authType === 'basic') {
            const username = endpoint.endpointId
                ? String(endpoint.username ?? '')
                : String(await resolveCredentialValue(config.username, context) ?? '');
            const password = endpoint.endpointId
                ? String(endpoint.password ?? '')
                : String(await resolveCredentialValue(config.password, context) ?? '');
            const raw = `${username}:${password}`;
            const encoded = typeof btoa === 'function'
                ? btoa(raw)
                : (globalThis as any).Buffer?.from(raw).toString('base64') || '';
            headers.Authorization = `Basic ${encoded}`;
        } else if (authType === 'bearer') {
            const token = endpoint.endpointId
                ? String(endpoint.token ?? '')
                : String(await resolveCredentialValue(config.token, context) ?? '');
            headers.Authorization = `Bearer ${token}`;
        } else if (authType === 'apikey') {
            const header = endpoint.endpointId
                ? String(endpoint.apiKeyHeader || 'x-api-key')
                : String(config.apiKeyHeader || 'x-api-key');
            const key = endpoint.endpointId
                ? String(endpoint.apiKey ?? '')
                : String(await resolveCredentialValue(config.apiKey, context) ?? '');
            if (key) {
                headers[header] = key;
            }
        }
        const response = await fetchImpl(String(url), {
            method: String(config.method || 'GET').toUpperCase(),
            headers: Object.keys(headers).length ? headers : undefined,
            body: await resolveRequestBody(config.body, context),
            redirect: (endpoint.endpointId ? endpoint.followRedirects : config.followRedirects !== false) ? 'follow' : 'manual'
        });
        const text = await response.text();
        const responseHeaders: Record<string, string> = {};
        try {
            response.headers?.forEach?.((value: string, key: string) => {
                responseHeaders[key] = value;
            });
        } catch {
            // Headers are optional metadata; never fail the request over them.
        }
        const responseType = String(config.responseType || 'auto');
        let body: any = text;
        if (responseType !== 'text') {
            try {
                body = text ? JSON.parse(text) : null;
            } catch (error) {
                if (responseType === 'json') {
                    return {
                        success: false,
                        error: new Error(`Invalid JSON response: ${(error as Error).message}`),
                        data: { nodeId: node.id, status: response.status },
                        status: {
                            text: `HTTP ${response.status} · invalid JSON`,
                            level: 'error',
                            key: 'workflow.nodeStatus.invalidJson',
                            params: { status: response.status }
                        }
                    };
                }
                body = text;
            }
        }
        const ignored = endpoint.endpointId ? endpoint.ignoreErrors : config.ignoreErrors === true;
        return {
            success: response.ok || ignored,
            error: response.ok || ignored ? undefined : new Error(`HTTP ${response.status}`),
            status: {
                text: `HTTP ${response.status}`,
                level: response.ok ? 'success' : ignored ? 'warn' : 'error',
                key: 'workflow.nodeStatus.http',
                params: { status: response.status }
            },
            data: {
                nodeId: node.id,
                status: response.status,
                statusCode: response.status,
                headers: responseHeaders,
                responseUrl: response.url || String(url),
                body
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error as Error,
            data: { nodeId: node.id },
            status: { text: 'Request failed', level: 'error', key: 'workflow.nodeStatus.requestFailed' }
        };
    }
}
