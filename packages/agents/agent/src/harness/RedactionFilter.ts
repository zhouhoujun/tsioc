import { AgentMessage, getAgentMessageText } from '../runtime/AgentMessage';

const SECRET_KEY = /(api[-_]?key|token|secret|password|authorization|cookie)/i;
const SECRET_VALUE = /(Bearer\s+)[A-Za-z0-9._-]+|\b(sk-[A-Za-z0-9_-]{8,})\b/gi;
const REDACTED = '[REDACTED]';

export class RedactionFilter {
    redactText(value: string): string {
        return String(value ?? '')
            .replace(SECRET_VALUE, match => match.startsWith('Bearer ') ? 'Bearer [REDACTED]' : REDACTED);
    }

    redactValue(value: any): any {
        if (typeof value === 'string') {
            return this.redactText(value);
        }
        if (Array.isArray(value)) {
            const mapped = value.map(item => this.redactValue(item));
            return mapped.every((item, index) => item === value[index]) ? value : mapped;
        }
        if (value && typeof value === 'object') {
            const output: Record<string, any> = {};
            let changed = false;
            for (const [key, item] of Object.entries(value)) {
                if (SECRET_KEY.test(key)) {
                    output[key] = REDACTED;
                    changed = true;
                } else {
                    const redacted = this.redactValue(item);
                    output[key] = redacted;
                    changed = changed || redacted !== item;
                }
            }
            return changed ? output : value;
        }
        return value;
    }

    redactMessage(message: AgentMessage): AgentMessage {
        const content = getAgentMessageText(message);
        const redactedContent = this.redactText(content);
        const metadata = message.metadata ? this.redactValue(message.metadata) : message.metadata;
        const parts = message.parts?.map(part => {
            if (part.type === 'text') {
                const redacted = this.redactText(part.text);
                return redacted === part.text ? part : { ...part, text: redacted };
            }
            if (part.type === 'image' && typeof part.name === 'string') {
                const redactedName = this.redactText(part.name);
                return redactedName === part.name ? part : { ...part, name: redactedName };
            }
            return part;
        });
        const partsChanged = JSON.stringify(parts) !== JSON.stringify(message.parts);
        if (redactedContent === content && metadata === message.metadata && !partsChanged) {
            return message;
        }
        return {
            ...message,
            content: redactedContent,
            parts,
            metadata
        };
    }
}
