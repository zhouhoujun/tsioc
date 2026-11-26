import type { FormGroup } from '@tsdi/components/forms';

/** JSON-friendly snapshot comparison for schema-driven form values. */
export function sameFormValue(left: any, right: any): boolean {
    try {
        return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
    } catch {
        return false;
    }
}

export function cloneFormValue<T>(value: T): T {
    try {
        return JSON.parse(JSON.stringify(value ?? null)) as T;
    } catch {
        return value;
    }
}

export interface DynamicFormStateHost {
    form?: FormGroup;
    initialSnapshot?: Record<string, any> | null;
    getValue(): Record<string, any>;
    beforeLeaveAction?: () => boolean | Promise<boolean>;
}

export function formIsDirty(host: DynamicFormStateHost): boolean {
    return !!host.form?.dirty
        || (!!host.initialSnapshot && !sameFormValue(host.initialSnapshot, host.getValue()));
}

export async function formCanLeave(host: DynamicFormStateHost): Promise<boolean> {
    if (!formIsDirty(host) || !host.beforeLeaveAction) {
        return true;
    }
    return !!(await host.beforeLeaveAction());
}

/** Field keys whose FormControl has been touched. */
export function formTouchedFields(form?: FormGroup): string[] {
    if (!form) {
        return [];
    }
    return Object.entries(form.controls || {})
        .filter(([, control]) => !!control?.touched)
        .map(([key]) => key);
}
