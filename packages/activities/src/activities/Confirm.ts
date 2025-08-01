import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { Component } from '@tsdi/components';




/**
 * confirm context
 */
 export class DirConfirmContext<T> {
    public $implicit: T = null!;
    public dirConfirm: T = null!;
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

@Component({ selector: 'confirm' })
export class ConfirmActivity extends Activity {

    async execute(context: ConfirmActivityContext): Promise<ActivityResult> {
        try {
            // 如果提供了自定义确认回调，使用它
            if (context.confirmCallback) {
                const confirmed = await context.confirmCallback();
                return {
                    success: confirmed,
                    data: {
                        confirmed,
                        timestamp: Date.now()
                    }
                };
            }

            // 使用默认的确认机制
            const message = context.message || this.options?.message || 'Please confirm this action';
            const title = context.title || this.options?.title || 'Confirmation';

            // 这里可以实现具体的确认UI逻辑
            // 为演示目的，我们返回一个 Promise
            return new Promise<ActivityResult>((resolve) => {
                const confirmed = window.confirm(`${title}\n${message}`);
                resolve({
                    success: confirmed,
                    data: {
                        confirmed,
                        timestamp: Date.now()
                    }
                });
            });
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    async compensate(context: ConfirmActivityContext): Promise<void> {
        if (context.cancelCallback) {
            await context.cancelCallback();
        }
    }
}
