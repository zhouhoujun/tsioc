import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface DelayActivityContext extends ActivityContext {
    /**
     * 延迟时间（毫秒）
     */
    delay: number;
    /**
     * 延迟完成回调
     */
    onComplete?: () => void;
    /**
     * 是否可中断
     */
    interruptible?: boolean;
}

export interface DelayActivityOptions {
    /**
     * 默认延迟时间（毫秒）
     */
    defaultDelay?: number;
    /**
     * 默认是否可中断
     */
    defaultInterruptible?: boolean;
}

@Injectable()
export class DelayActivity implements Activity<DelayActivityContext> {
    name = 'delay';
    private timeoutId: NodeJS.Timeout | null = null;

    constructor(private options: DelayActivityOptions = {}) {
        this.options = {
            defaultDelay: 1000,
            defaultInterruptible: true,
            ...options
        };
    }

    async execute(context: DelayActivityContext): Promise<ActivityResult> {
        if (!context.delay && !this.options.defaultDelay) {
            return {
                success: false,
                error: new Error('No delay time specified')
            };
        }

        const delay = context.delay ?? this.options.defaultDelay!;
        const interruptible = context.interruptible ?? this.options.defaultInterruptible;

        try {
            await new Promise<void>((resolve, reject) => {
                this.timeoutId = setTimeout(() => {
                    resolve();
                }, delay);

                if (!interruptible) {
                    this.timeoutId.unref();
                }
            });

            context.onComplete?.();

            return {
                success: true,
                data: {
                    delay,
                    completed: true,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    delay,
                    completed: false,
                    timestamp: Date.now()
                }
            };
        }
    }

    async compensate(context: DelayActivityContext): Promise<void> {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}
