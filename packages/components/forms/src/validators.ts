export type ValidationErrors = Record<string, any> | null;

export type ValidatorFn = (control: import('./control').AbstractControl) => ValidationErrors;
export type AsyncValidatorFn = (control: import('./control').AbstractControl) => Promise<ValidationErrors>;

function isEmptyValue(value: any): boolean {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function mergeErrors(...results: ValidationErrors[]): ValidationErrors {
    const errors = results.filter(Boolean).reduce<Record<string, any>>((all, item) => ({ ...all, ...item }), {});
    return Object.keys(errors).length ? errors : null;
}

export const Validators = {
    required(control: import('./control').AbstractControl): ValidationErrors {
        return isEmptyValue(control.value) ? { required: true } : null;
    },

    requiredTrue(control: import('./control').AbstractControl): ValidationErrors {
        return control.value === true ? null : { required: true };
    },

    email(control: import('./control').AbstractControl): ValidationErrors {
        if (isEmptyValue(control.value)) {
            return null;
        }
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(control.value))
            ? null
            : { email: true };
    },

    minLength(minLength: number): ValidatorFn {
        return (control) => isEmptyValue(control.value) || String(control.value).length >= minLength
            ? null
            : { minlength: { requiredLength: minLength, actualLength: String(control.value).length } };
    },

    maxLength(maxLength: number): ValidatorFn {
        return (control) => isEmptyValue(control.value) || String(control.value).length <= maxLength
            ? null
            : { maxlength: { requiredLength: maxLength, actualLength: String(control.value).length } };
    },

    pattern(pattern: RegExp | string): ValidatorFn {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        return (control) => {
            if (isEmptyValue(control.value)) {
                return null;
            }
            regex.lastIndex = 0;
            return regex.test(String(control.value)) ? null : { pattern: { requiredPattern: regex.toString(), actualValue: control.value } };
        };
    },

    min(min: number): ValidatorFn {
        return (control) => isEmptyValue(control.value) || Number(control.value) >= min
            ? null
            : { min: { min, actual: control.value } };
    },

    max(max: number): ValidatorFn {
        return (control) => isEmptyValue(control.value) || Number(control.value) <= max
            ? null
            : { max: { max, actual: control.value } };
    },

    nullValidator(): ValidationErrors {
        return null;
    },

    compose(validators: Array<ValidatorFn | null | undefined>): ValidatorFn {
        return control => mergeErrors(...validators.filter((item): item is ValidatorFn => typeof item === 'function').map(item => item(control)));
    },

    composeAsync(validators: Array<AsyncValidatorFn | null | undefined>): AsyncValidatorFn {
        return async control => {
            const results = await Promise.all(
                validators.filter((item): item is AsyncValidatorFn => typeof item === 'function').map(item => item(control))
            );
            return mergeErrors(...results);
        };
    }
};
