import { summarizeToolDisplayText } from '../tools/ToolSummary';

export function safeSerializeToolInput(input: any): string | undefined {
    if (input === undefined) {
        return undefined;
    }
    const seen = new WeakSet<object>();
    try {
        return JSON.stringify(input, (_key, current) => {
            if (typeof current === 'bigint') {
                return current.toString();
            }
            if (current && typeof current === 'object') {
                if (seen.has(current)) {
                    return '[circular]';
                }
                seen.add(current);
            }
            return current;
        });
    } catch {
        return '[unserializable]';
    }
}

export function cloneToolInput(input: any): any {
    const serialized = safeSerializeToolInput(input);
    if (serialized == null) {
        return input;
    }
    try {
        return JSON.parse(serialized);
    } catch {
        return serialized;
    }
}

export function summarizeToolInput(toolName: string, input: any): string | undefined {
    return summarizeToolDisplayText(toolName, input, 'input');
}

export function summarizeToolOutput(toolName: string, output: any): string | undefined {
    return summarizeToolDisplayText(toolName, output, 'output');
}
