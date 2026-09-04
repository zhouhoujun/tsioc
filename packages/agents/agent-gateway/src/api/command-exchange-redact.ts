import { CommandExchangeRecord, RedactionFilter } from '@tsdi/agent';

const redactor = new RedactionFilter();

/**
 * Redact secret-shaped content inside a command exchange record before it
 * leaves the gateway (P284: "脱敏和 ownership 在 gateway 强制").
 * Applies the same token rules as the rest of the gateway (RedactionFilter).
 */
export function redactCommandExchangeRecord(record: CommandExchangeRecord): CommandExchangeRecord {
    const content = redactor.redactText(record.content);
    const command = record.command != null ? redactor.redactText(record.command) : undefined;
    const args = record.args != null ? redactor.redactText(record.args) : undefined;
    const error = record.error != null ? redactor.redactText(record.error) : undefined;
    if (content === record.content && command === record.command && args === record.args && error === record.error) {
        return record;
    }
    return { ...record, content, command, args, error };
}