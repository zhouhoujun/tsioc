import { NodePort, WorkflowConfigField } from '../../visual/types';

export function pluginPort(id: string, name: string, type: 'input' | 'output', label: string): NodePort {
    return { id, name, type, label };
}

export function pluginField(field: WorkflowConfigField): WorkflowConfigField {
    return { ...field };
}

export function encodePayload(value: any): string {
    if (value === undefined || value === null) {
        return '';
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
}

export function decodePayload(value: any): any {
    if (value === undefined || value === null) {
        return value;
    }
    const text = typeof value === 'string'
        ? value
        : (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))
            ? value.toString('utf8')
            : String(value);
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export function payloadBytes(value: any): Uint8Array {
    return new TextEncoder().encode(encodePayload(value));
}

export function errorResult(nodeId: string, error: unknown, extra: Record<string, any> = {}) {
    return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        data: { nodeId, ...extra }
    };
}
