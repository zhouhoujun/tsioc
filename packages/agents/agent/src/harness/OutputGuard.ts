import { Injectable } from '@tsdi/ioc';

const REDACTED = '[REDACTED]';
const SECRET_KEY_PATTERN = /(api[-_]?key|token|secret|password|authorization)/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._-]+/gi;
const OPENAI_KEY_PATTERN = /sk-[A-Za-z0-9_-]+/g;

@Injectable()
export class OutputGuard {
    redact(value: unknown, enabled = true): unknown {
        if (!enabled) {
            return value;
        }
        return this.redactValue(value, undefined);
    }

    private redactValue(value: unknown, key?: string): unknown {
        if (value == null) {
            return value;
        }
        if (typeof value === 'string') {
            if (key && SECRET_KEY_PATTERN.test(key)) {
                return REDACTED;
            }
            return value
                .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
                .replace(OPENAI_KEY_PATTERN, REDACTED);
        }
        if (Array.isArray(value)) {
            return value.map(item => this.redactValue(item));
        }
        if (typeof value === 'object') {
            return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [entryKey, entryValue]) => ({
                ...acc,
                [entryKey]: this.redactValue(entryValue, entryKey)
            }), {});
        }
        return value;
    }
}
