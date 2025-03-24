import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';




/**
 * confirm context
 */
 export class DirConfirmContext<T> {
    public $implicit: T = null!;
    public dirConfirm: T = null!;
}

export interface ConfirmActivityContext extends ActivityContext {
    /**
     * 确认消息
     */
    message: string;
    /**
     * 确认选项
     */
    options?: {
        /**
         * 确认按钮文本
         */
        confirmText?: string;
        /**
         * 取消按钮文本
         */
        cancelText?: string;
        /**
         * 超时时间（毫秒）
         */
        timeout?: number;
        /**
         * 默认选择
         */
        defaultChoice?: boolean;
    };
    /**
     * 确认回调
     */
    onConfirm?: (confirmed: boolean) => void;
    /**
     * 超时回调
     */
    onTimeout?: () => void;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error) => Promise<ActivityResult>;
}

export interface ConfirmActivityOptions {
    /**
     * 默认确认选项
     */
    defaultOptions?: {
        confirmText: string;
        cancelText: string;
        timeout: number;
        defaultChoice: boolean;
    };
}

@Injectable()
export class ConfirmActivity implements Activity<ConfirmActivityContext> {
    name = 'confirm';

    constructor(private options: ConfirmActivityOptions = {}) {
        this.options = {
            defaultOptions: {
                confirmText: '确认',
                cancelText: '取消',
                timeout: 30000,
                defaultChoice: false,
                ...options.defaultOptions
            },
            ...options
        };
    }

    async execute(context: ConfirmActivityContext): Promise<ActivityResult> {
        if (!context.message) {
            return {
                success: false,
                error: new Error('No confirmation message provided')
            };
        }

        const defaultOptions = this.options.defaultOptions!;
        const options = {
            confirmText: defaultOptions.confirmText,
            cancelText: defaultOptions.cancelText,
            timeout: defaultOptions.timeout,
            defaultChoice: defaultOptions.defaultChoice,
            ...(context.options || {})
        };

        try {
            // 模拟确认对话框
            const confirmed = await this.showConfirmation(context.message, options);

            context.onConfirm?.(confirmed);

            return {
                success: true,
                data: {
                    confirmed,
                    timestamp: Date.now(),
                    message: context.message
                }
            };
        } catch (error) {
            // 如果有自定义错误处理器，使用它
            if (context.errorHandler) {
                try {
                    return await context.errorHandler(error as Error);
                } catch (handlerError) {
                    return {
                        success: false,
                        error: handlerError as Error,
                        data: {
                            originalError: error,
                            handlerError: handlerError
                        }
                    };
                }
            }

            return {
                success: false,
                error: error as Error,
                data: {
                    confirmed: false,
                    error: error as Error
                }
            };
        }
    }

    private async showConfirmation(
        message: string,
        options: {
            confirmText: string;
            cancelText: string;
            timeout: number;
            defaultChoice: boolean;
        }
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // 设置超时
            const timeoutId = setTimeout(() => {
                reject(new Error('Confirmation timeout'));
            }, options.timeout);

            // 模拟用户交互
            // 在实际应用中，这里应该显示真实的确认对话框
            // 并等待用户响应
            setTimeout(() => {
                clearTimeout(timeoutId);
                resolve(options.defaultChoice);
            }, 1000);
        });
    }

    async compensate(context: ConfirmActivityContext): Promise<void> {
        // 如果需要，实现补偿逻辑
        // 例如：清理临时状态、回滚操作等
    }
}
