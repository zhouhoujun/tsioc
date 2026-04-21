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
export declare class ValidateActivity extends Activity {
    data: any;
    rules: ValidationRule[];
    stopOnFirstError: boolean;
    throwOnError: boolean;
    execute(context: ValidateActivityContext): Promise<ActivityResult>;
}
export declare class RequiredActivity extends Activity {
    field: string;
    message: string;
    execute(context: ValidateActivityContext): Promise<ActivityResult>;
}
export declare class RangeActivity extends Activity {
    field: string;
    min?: number;
    max?: number;
    message?: string;
    execute(context: ValidateActivityContext): Promise<ActivityResult>;
}
export declare class PatternActivity extends Activity {
    field: string;
    pattern: RegExp | string;
    message?: string;
    execute(context: ValidateActivityContext): Promise<ActivityResult>;
}
