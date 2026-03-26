import { Attribute, Component } from '@tsdi/components';
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

@Component({ selector: 'log' })
export class LogActivity extends Activity {

    @Attribute()
    level: LogLevel = 'info';

    @Attribute()
    message: string = '';

    @Attribute()
    data?: any;

    @Attribute()
    includeTimestamp: boolean = true;

    @Attribute()
    includeContext: boolean = false;

    async execute(context: LogActivityContext): Promise<ActivityResult> {
        try {
            const timestamp = this.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
            const logMessage = this.formatMessage(timestamp);

            const logger = context.logger || console;
            const logFn = logger[this.level] || logger.info;

            if (this.data !== undefined) {
                logFn.call(logger, logMessage, this.data);
            } else {
                logFn.call(logger, logMessage);
            }

            if (this.includeContext) {
                logFn.call(logger, 'Context:', context);
            }

            return {
                success: true,
                data: {
                    logged: true,
                    level: this.level,
                    message: logMessage,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private formatMessage(timestamp: string): string {
        const levelPrefix = `[${this.level.toUpperCase()}]`;
        return `${timestamp}${levelPrefix} ${this.message}`;
    }
}