import type { WorkflowValueRef } from './types';

/**
 * Upgrade legacy node configs to the current field shape on load.
 *
 * Change rules used four overlapping fields (`valueFrom` + `value` +
 * `valuePath` + `valueExpression`); they now carry one typed `value`. The
 * runtime still understands the legacy fields, so documents executed without
 * the designer keep working; the migration only rewrites editor documents once.
 */
export function migrateNodeConfig(type: string, config: Record<string, any>): Record<string, any> {
    if (type !== 'change' || !config || !Array.isArray(config.rules)) {
        return config;
    }
    let changed = false;
    const rules = config.rules.map((rule: any) => {
        if (!rule || typeof rule !== 'object') {
            return rule;
        }
        if (rule.value && typeof rule.value === 'object' && typeof rule.value.type === 'string') {
            return rule;
        }
        const valueFrom = String(rule.valueFrom || '');
        const valuePath = String(rule.valuePath || '');
        const valueExpression = String(rule.valueExpression || '');
        const hasLegacy = 'valueFrom' in rule || 'valuePath' in rule || 'valueExpression' in rule;
        if (!hasLegacy && rule.value === undefined) {
            return rule;
        }
        let value: any = rule.value;
        if (valueFrom === 'msg' || valueFrom === 'flow' || valueFrom === 'global' || valueFrom === 'env') {
            value = { type: valueFrom, path: valuePath } as WorkflowValueRef;
        } else if (valueFrom === 'expression') {
            value = { type: 'expression', value: valueExpression } as WorkflowValueRef;
        } else if (valueFrom === '' || valueFrom === 'literal') {
            value = typedLiteral(value);
        } else {
            // Unknown legacy source: leave the rule for the runtime fallback.
            return rule;
        }
        changed = true;
        const { valueFrom: _from, valuePath: _path, valueExpression: _expression, ...rest } = rule;
        return { ...rest, value };
    });
    return changed ? { ...config, rules } : config;
}

/** Literal storage that keeps the value's JSON type across edits. */
function typedLiteral(value: any): any {
    if (typeof value === 'string') {
        try {
            JSON.parse(value);
            return { type: 'literal', valueType: 'json', value } as WorkflowValueRef;
        } catch {
            return value;
        }
    }
    if (typeof value === 'number') {
        return { type: 'literal', valueType: 'num', value: String(value) } as WorkflowValueRef;
    }
    if (typeof value === 'boolean') {
        return { type: 'literal', valueType: 'bool', value: String(value) } as WorkflowValueRef;
    }
    if (value && typeof value === 'object') {
        return { type: 'literal', valueType: 'json', value: JSON.stringify(value) } as WorkflowValueRef;
    }
    return value;
}
