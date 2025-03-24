import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface DelayActivityContext extends ActivityContext {
    /**
     * 延迟时间（毫秒）
     */
    duration?: number;
    /**
     * 自定义延迟实现
     */
    delayCallback?: () => Promise<void>;
    /**
     * 是否可中断
     */
    interruptible?: boolean;
    /**
     * 进度回调
     */
    onProgress?: (progress: number) => void;
}

export interface DelayActivityOptions {
    /**
     * 默认延迟时间（毫秒）
     */
    defaultDuration?: number;
    /**
     * 是否显示进度
     */
    showProgress?: boolean;
    /**
     * 进度更新间隔（毫秒）
     */
    progressInterval?: number;
}

@Injectable()
export class DelayActivity implements Activity<DelayActivityContext> {
    name = 'delay';
    private abortController: AbortController | null = null;

    constructor(private options: DelayActivityOptions = {}) {
        this.options = {
            defaultDuration: 1000,
            showProgress: false,
            progressInterval: 100,
            ...options
        };
    }

    async execute(context: DelayActivityContext): Promise<ActivityResult> {
        try {
            // 如果提供了自定义延迟回调，使用它
            if (context.delayCallback) {
                await context.delayCallback();
                return {
                    success: true,
                    data: { completed: true }
                };
            }

            const duration = context.duration ?? this.options.defaultDuration;
            if (!duration || duration < 0) {
                throw new Error('Invalid delay duration');
            }

            // 创建可中断的延迟
            this.abortController = new AbortController();
            await this.delay(duration, context);

            return {
                success: true,
                data: {
                    duration,
                    completed: true,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return {
                    success: false,
                    data: { interrupted: true },
                    error: new Error('Delay interrupted')
                };
            }
            return {
                success: false,
                error: error as Error
            };
        } finally {
            this.abortController = null;
        }
    }

    async compensate(context: DelayActivityContext): Promise<void> {
        // 中断当前延迟
        if (context.interruptible && this.abortController) {
            this.abortController.abort();
        }
    }

    private async delay(duration: number, context: DelayActivityContext): Promise<void> {
        const startTime = Date.now();
        const { showProgress, progressInterval } = this.options;

        if (showProgress && context.onProgress) {
            // 带进度的延迟实现
            return new Promise((resolve, reject) => {
                const updateProgress = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min((elapsed / duration) * 100, 100);
                    context.onProgress?.(progress);

                    if (elapsed >= duration) {
                        resolve();
                    } else {
                        setTimeout(updateProgress, progressInterval);
                    }
                };

                // 设置中断处理
                if (this.abortController) {
                    this.abortController.signal.addEventListener('abort', () => {
                        reject(new DOMException('Delay aborted', 'AbortError'));
                    });
                }

                updateProgress();
            });
        } else {
            // 简单延迟实现
            await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(resolve, duration);

                if (this.abortController) {
                    this.abortController.signal.addEventListener('abort', () => {
                        clearTimeout(timeoutId);
                        reject(new DOMException('Delay aborted', 'AbortError'));
                    });
                }
            });
        }
    }
}
