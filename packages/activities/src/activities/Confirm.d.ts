import { Activity, ActivityContext, ActivityResult } from './Activity';
/**
 * confirm context
 */
export declare class DirConfirmContext<T> {
    $implicit: T;
    dirConfirm: T;
}
export interface ConfirmActivityContext extends ActivityContext {
    message?: string;
    title?: string;
    confirmCallback?: () => Promise<boolean>;
    cancelCallback?: () => Promise<void>;
}
export interface ConfirmActivityOptions {
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
}
export declare class ConfirmActivity extends Activity {
    options?: ConfirmActivityOptions;
    execute(context: ConfirmActivityContext): Promise<ActivityResult>;
    compensate(context: ConfirmActivityContext): Promise<void>;
}
