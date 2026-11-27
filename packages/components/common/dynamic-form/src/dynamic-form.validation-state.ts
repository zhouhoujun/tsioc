import type { FormGroup } from '@tsdi/components/forms';
import type {
    DynamicFormField,
    DynamicFormFieldStatus,
    DynamicFormIssue,
    DynamicFormSchema,
    DynamicFormValidateResult
} from './dynamic-form.types';
import { errorFor, fieldIssue, typedCodecError } from './dynamic-form.fields';

/**
 * State the async/external validation helpers need from the form component.
 * Keeping the algorithms here lets `dynamic-form.ts` stay a projection/editing
 * component instead of growing a second validation controller.
 */
export interface DynamicFormValidationHost {
    _schema: DynamicFormSchema;
    form?: FormGroup;
    externalIssues: Record<string, DynamicFormIssue>;
    asyncIssues: Record<string, DynamicFormIssue>;
    /** Last validation outcome per field (`pending` while an async check runs). */
    fieldStatuses?: Record<string, DynamicFormFieldStatus>;
    validating: boolean;
    submitAttempted: boolean;
    validateOn: 'none' | 'change' | 'blur' | 'submit';
    validationDelay: number;
    validationTimer?: any;
    validationSequence: number;
    validationAbort?: AbortController;
    destroyed: boolean;
    elementRef?: any;
    focusFieldAction?: (key: string) => void;
    validityAction?: (valid: boolean, errors: Record<string, any> | null) => void;
    schemaFields(): DynamicFormField[];
    isVisible(field: DynamicFormField): boolean;
    getValue(): Record<string, any>;
    refreshErrors(): void;
}

export function isFormValid(host: DynamicFormValidationHost): boolean {
    const blocking = [...Object.values(host.externalIssues), ...Object.values(host.asyncIssues)]
        .some(issue => (issue?.severity || 'error') !== 'warning');
    const invalidTyped = host.schemaFields().some(field => !!typedCodecError(host as any, field));
    return !!host.form?.valid && !blocking && !invalidTyped;
}

export function mergedFormErrors(host: DynamicFormValidationHost): Record<string, any> | null {
    const errors: Record<string, any> = { ...(host.form?.errors || {}) };
    Object.values(host.externalIssues).forEach(issue => {
        errors[issue.key] = { external: issue.message, severity: issue.severity || 'error' };
    });
    Object.values(host.asyncIssues).forEach(issue => {
        errors[issue.key] = { async: issue.message, severity: issue.severity || 'error' };
    });
    host.schemaFields().forEach(field => {
        const message = typedCodecError(host as any, field);
        if (message) {
            errors[field.key] = { typed: message, severity: 'error' };
        }
    });
    return Object.keys(errors).length ? errors : null;
}

/** Host-injected issues (reference checks, server validation). */
export function setFormIssues(host: DynamicFormValidationHost, issues: DynamicFormIssue[] = []): void {
    const next: Record<string, DynamicFormIssue> = {};
    (issues || []).forEach(issue => {
        if (!issue?.key) {
            return;
        }
        next[issue.key] = {
            key: issue.key,
            message: String(issue.message || ''),
            severity: issue.severity === 'warning' ? 'warning' : 'error'
        };
    });
    host.externalIssues = next;
    // Stored outcomes only cover async checks; host issues are derived live in
    // `fieldStatus`, so drop stale "valid" markers for the affected fields.
    const statuses = { ...(host.fieldStatuses || {}) };
    Object.keys(next).forEach(key => delete statuses[key]);
    host.fieldStatuses = statuses;
    host.validityAction?.(isFormValid(host), mergedFormErrors(host));
}

/** Clear external (all or selected keys) and/or async issues. */
export function clearFormIssues(
    host: DynamicFormValidationHost,
    keys?: string[],
    source: 'external' | 'async' | 'all' = 'all'
): void {
    const drop = (map: Record<string, DynamicFormIssue>): Record<string, DynamicFormIssue> => {
        if (!keys) {
            return {};
        }
        const next = { ...map };
        keys.forEach(key => delete next[key]);
        return next;
    };
    if (source === 'external' || source === 'all') {
        host.externalIssues = drop(host.externalIssues);
    }
    if (source === 'async' || source === 'all') {
        host.asyncIssues = drop(host.asyncIssues);
    }
    const affected = keys || Object.keys(host.fieldStatuses || {});
    if (affected.length) {
        const statuses = { ...(host.fieldStatuses || {}) };
        affected.forEach(key => delete statuses[key]);
        host.fieldStatuses = statuses;
    }
}

export function formValidationResult(host: DynamicFormValidationHost): DynamicFormValidateResult {
    return {
        valid: isFormValid(host),
        value: host.getValue(),
        errors: mergedFormErrors(host)
    };
}

/** Run field and schema async validation, ignoring stale/aborted runs. */
export async function validateFormAsync(host: DynamicFormValidationHost): Promise<DynamicFormValidateResult> {
    const sequence = ++host.validationSequence;
    host.validationAbort?.abort();
    const abort = typeof AbortController === 'function' ? new AbortController() : undefined;
    host.validationAbort = abort;
    host.validating = true;
    host.submitAttempted = true;
    host.form?.markAllAsTouched();
    host.refreshErrors();
    const values = host.getValue();
    const issues: Record<string, DynamicFormIssue> = {};
    const visible = host.schemaFields().filter(field =>
        !field.hidden && field.type !== 'hidden' && host.isVisible(field));
    // Drop the previous outcome and surface "checking" while the async run is
    // in flight. Only fields with a validator get a pending marker; the schema
    // hook is cross-field and does not own a single control.
    const pendingKeys = visible
        .filter(field => typeof field.validate === 'function')
        .map(field => field.key);
    if (pendingKeys.length) {
        const nextIssues = { ...host.asyncIssues };
        const statuses = { ...(host.fieldStatuses || {}) };
        pendingKeys.forEach(key => {
            delete nextIssues[key];
            statuses[key] = 'pending';
        });
        host.asyncIssues = nextIssues;
        host.fieldStatuses = statuses;
    }
    for (const field of visible) {
        if (typeof field.validate !== 'function') {
            continue;
        }
        let message: string | undefined;
        try {
            message = await field.validate(values[field.key], {
                value: values[field.key],
                values,
                field,
                signal: abort?.signal
            });
        } catch (error) {
            message = (error as Error)?.message || String(error);
        }
        if (sequence !== host.validationSequence) {
            return formValidationResult(host);
        }
        if (message) {
            issues[field.key] = { key: field.key, message, severity: 'error' };
        }
        host.fieldStatuses = {
            ...(host.fieldStatuses || {}),
            [field.key]: message ? 'invalid' : 'valid'
        };
    }
    if (typeof host._schema.validate === 'function') {
        try {
            const schemaIssues = await host._schema.validate(values, abort?.signal);
            if (sequence !== host.validationSequence) {
                return formValidationResult(host);
            }
            (schemaIssues || []).forEach(issue => {
                if (issue?.key) {
                    issues[issue.key] = {
                        key: issue.key,
                        message: String(issue.message || ''),
                        severity: issue.severity === 'warning' ? 'warning' : 'error'
                    };
                }
            });
        } catch (error) {
            issues[''] = {
                key: '',
                message: (error as Error)?.message || String(error),
                severity: 'error'
            };
        }
    }
    if (sequence !== host.validationSequence) {
        return formValidationResult(host);
    }
    host.asyncIssues = issues;
    host.validationAbort = undefined;
    host.validating = false;
    const result = formValidationResult(host);
    host.validityAction?.(result.valid, result.errors);
    if (!result.valid) {
        focusFirstFormError(host);
    }
    return result;
}

export interface DynamicFormErrorSummaryItem {
    key: string;
    label: string;
    message: string;
}

/** Visible errors in schema order for an opt-in form-level summary. */
export function formErrorSummary(host: DynamicFormValidationHost): DynamicFormErrorSummaryItem[] {
    return host.schemaFields()
        .filter(field => !field.hidden && field.type !== 'hidden' && host.isVisible(field))
        .map(field => ({
            key: field.key,
            label: String(field.label || field.key),
            message: errorFor(host as any, field)
        }))
        .filter(item => !!item.message);
}

/** Focus one field and its first control; used by the summary and submit flow. */
export function focusFormField(host: DynamicFormValidationHost, key: string): string {
    const targetKey = String(key || '');
    if (!targetKey) {
        return '';
    }
    host.focusFieldAction?.(targetKey);
    const root = host.elementRef?.nativeElement;
    const wrapper = root?.querySelector?.(`[data-field-key="${targetKey}"]`);
    const target = wrapper?.querySelector?.('input, textarea, select, button');
    target?.focus?.();
    return targetKey;
}

/** Focus the first invalid/issue field; returns its key ('' when valid). */
export function focusFirstFormError(host: DynamicFormValidationHost): string {
    const key = host.schemaFields()
        .filter(field => !field.hidden && field.type !== 'hidden' && host.isVisible(field))
        .map(field => field.key)
        .find(fieldKey => {
            const field = host.schemaFields().find(item => item.key === fieldKey);
            const control = host.form?.get(fieldKey);
            return !!host.externalIssues[fieldKey]
                || !!host.asyncIssues[fieldKey]
                || !!control?.invalid
                || (!!field && !!typedCodecError(host as any, field));
        }) || '';
    return key ? focusFormField(host, key) : '';
}

export function scheduleFormValidation(host: DynamicFormValidationHost, mode: 'change' | 'blur'): void {
    if (host.validateOn === 'none' || host.validateOn !== mode) {
        return;
    }
    if (host.validationTimer) {
        clearTimeout(host.validationTimer);
    }
    const delay = Math.max(0, Number(host.validationDelay) || 0);
    host.validationTimer = setTimeout(() => {
        host.validationTimer = undefined;
        if (!host.destroyed) {
            void validateFormAsync(host);
        }
    }, delay);
}

export function issueSeverityFor(host: DynamicFormValidationHost, field: DynamicFormField): string {
    const issue = fieldIssue(host as any, field);
    return issue ? (issue.severity || 'error') : '';
}

/**
 * Effective validation state for a field. Injected/host issues and sync errors
 * win over stored async outcomes, so an earlier "valid" marker can never mask
 * a newly injected reference error.
 */
export function fieldStatus(
    host: DynamicFormValidationHost,
    field: DynamicFormField
): DynamicFormFieldStatus {
    const injected = fieldIssue(host as any, field);
    if (injected && (injected.severity || 'error') !== 'warning') {
        return 'invalid';
    }
    const stored = host.fieldStatuses?.[field.key];
    if (stored === 'pending') {
        return 'pending';
    }
    if (errorFor(host as any, field)) {
        if (!(injected && injected.severity === 'warning')) {
            return 'invalid';
        }
        // A warning masks the sync message in `errorFor`; still report a real
        // control/typed error instead of pretending the field is valid.
        if (typedCodecError(host as any, field)) {
            return 'invalid';
        }
        const control = (host as any).form?.get(field.key);
        if (control && !control.valid && (control.dirty || control.touched || host.submitAttempted)) {
            return 'invalid';
        }
    }
    if (stored === 'valid') {
        return 'valid';
    }
    return 'default';
}

export function fieldPending(host: DynamicFormValidationHost, field: DynamicFormField): boolean {
    return fieldStatus(host, field) === 'pending';
}

export function fieldValid(host: DynamicFormValidationHost, field: DynamicFormField): boolean {
    return fieldStatus(host, field) === 'valid';
}

/** Message produced by the async validation pass (not host-injected issues). */
export function fieldAsyncError(
    host: DynamicFormValidationHost,
    field: DynamicFormField
): string {
    return host.asyncIssues?.[field.key]?.message || '';
}
