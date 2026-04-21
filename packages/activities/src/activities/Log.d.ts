import { Activity, ActivityContext, ActivityResult } from './Activity';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogActivityContext extends ActivityContext {
    logger?: {
        debug: (...args: any[]) => void;
        info: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
}
export declare class LogActivity extends Activity {
    level: LogLevel;
    message: string;
    data?: any;
    includeTimestamp: boolean;
    includeContext: boolean;
    execute(context: LogActivityContext): Promise<ActivityResult>;
    private formatMessage;
}
