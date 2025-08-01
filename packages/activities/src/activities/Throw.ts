import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { Component } from '@tsdi/components';

export interface ThrowActivityContext extends ActivityContext {
    /**
     * 要抛出的错误
     */
    error: Error | string;
    /**
     * 错误详情
     */
    details?: any;
    /**
     * 错误代码
     */
    code?: string | number;
    /**
     * 是否在抛出错误前执行补偿操作
     */
    compensateBeforeThrow?: boolean;
}

export interface ThrowActivityOptions {
    /**
     * 默认错误代码
     */
    defaultErrorCode?: string | number;
}

@Component({ selector: 'throw' })
export class ThrowActivity extends Activity {

    async execute(context: ThrowActivityContext): Promise<ActivityResult> {
        if (!context.error) {
            return {
                success: false,
                error: new Error('No error specified to throw')
            };
        }

        // 创建错误对象
        const error = typeof context.error === 'string' 
            ? new Error(context.error)
            : context.error;

        // 添加错误代码和详情
        if (context.code || this.options.defaultErrorCode) {
            (error as any).code = context.code ?? this.options.defaultErrorCode;
        }
        if (context.details) {
            (error as any).details = context.details;
        }

        return {
            success: false,
            error,
            data: {
                thrown: true,
                timestamp: Date.now(),
                code: (error as any).code,
                details: (error as any).details
            }
        };
    }

    async compensate(context: ThrowActivityContext): Promise<void> {
        // ThrowActivity 不需要补偿操作
    }
}
