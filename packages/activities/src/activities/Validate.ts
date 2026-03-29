import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export type ValidatorFunction = (value: any, context: ActivityContext) => boolean | string | Promise<boolean | string>;

export interface ValidationRule {
    field: string;
    validator: ValidatorFunction;
    message?: string;
}

export interface ValidateActivityContext extends ActivityContext {
    data?: any;
    validationErrors?: Record<string, string[]>;
}

@Directive({ selector: 'validate' })
export class ValidateActivity extends Activity {

    @Attribute()
    data: any;

    @Attribute()
    rules: ValidationRule[] = [];

    @Attribute()
    stopOnFirstError: boolean = true;

    @Attribute()
    throwOnError: boolean = false;

    async execute(context: ValidateActivityContext): Promise<ActivityResult> {
        try {
            const validationErrors: Record<string, string[]> = {};
            let isValid = true;

            for (const rule of this.rules) {
                const value = this.data?.[rule.field];
                const result = await rule.validator(value, context);

                if (result !== true) {
                    isValid = false;
                    const errorMessage = typeof result === 'string' ? result : rule.message || `Validation failed for field: ${rule.field}`;
                    
                    if (!validationErrors[rule.field]) {
                        validationErrors[rule.field] = [];
                    }
                    validationErrors[rule.field].push(errorMessage);

                    if (this.stopOnFirstError) {
                        break;
                    }
                }
            }

            if (!isValid && this.throwOnError) {
                throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
            }

            context.validationErrors = validationErrors;

            return {
                success: isValid,
                data: {
                    isValid,
                    errors: validationErrors,
                    validatedFields: this.rules.map(r => r.field)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: { data: this.data }
            };
        }
    }
}

@Directive({ selector: 'required' })
export class RequiredActivity extends Activity {

    @Attribute()
    field!: string;

    @Attribute()
    message: string = 'Field is required';

    async execute(context: ValidateActivityContext): Promise<ActivityResult> {
        const value = context.data?.[this.field];
        const isValid = value !== undefined && value !== null && value !== '';

        return {
            success: isValid,
            data: {
                field: this.field,
                isValid,
                error: isValid ? undefined : this.message
            }
        };
    }
}

@Directive({ selector: 'range' })
export class RangeActivity extends Activity {

    @Attribute()
    field!: string;

    @Attribute()
    min?: number;

    @Attribute()
    max?: number;

    @Attribute()
    message?: string;

    async execute(context: ValidateActivityContext): Promise<ActivityResult> {
        const value = context.data?.[this.field];
        
        if (typeof value !== 'number') {
            return {
                success: false,
                error: new Error(`Field ${this.field} is not a number`),
                data: { field: this.field, value }
            };
        }

        let isValid = true;
        const errors: string[] = [];

        if (this.min !== undefined && value < this.min) {
            isValid = false;
            errors.push(`Value must be at least ${this.min}`);
        }

        if (this.max !== undefined && value > this.max) {
            isValid = false;
            errors.push(`Value must be at most ${this.max}`);
        }

        return {
            success: isValid,
            data: {
                field: this.field,
                value,
                isValid,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }
}

@Directive({ selector: 'pattern' })
export class PatternActivity extends Activity {

    @Attribute()
    field!: string;

    @Attribute()
    pattern!: RegExp | string;

    @Attribute()
    message?: string;

    async execute(context: ValidateActivityContext): Promise<ActivityResult> {
        const value = context.data?.[this.field];
        
        if (typeof value !== 'string') {
            return {
                success: false,
                error: new Error(`Field ${this.field} is not a string`),
                data: { field: this.field, value }
            };
        }

        const regex = typeof this.pattern === 'string' ? new RegExp(this.pattern) : this.pattern;
        const isValid = regex.test(value);

        return {
            success: isValid,
            data: {
                field: this.field,
                value,
                isValid,
                error: isValid ? undefined : (this.message || `Value does not match pattern: ${this.pattern}`)
            }
        };
    }
}