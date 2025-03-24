import { createDecorator } from '@tsdi/ioc';
import { IntervalActivity, IntervalActivityContext, IntervalActivityOptions } from '../activities/Interval';
import { Activity } from '../activities/Activity';

export interface IntervalDecoratorOptions extends IntervalActivityOptions {
    /**
     * 默认执行间隔（毫秒）
     */
    defaultInterval?: number;
    /**
     * 默认是否立即执行
     */
    defaultImmediate?: boolean;
}

export function Interval(options: IntervalDecoratorOptions = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const activity = new IntervalActivity(options);

        descriptor.value = async function (
            action: Activity,
            methodOptions?: {
                interval?: number;
                maxExecutions?: number;
                immediate?: boolean;
                onExecution?: (execution: number, result: any) => void;
                onComplete?: () => void;
            }
        ) {
            const context: IntervalActivityContext = {
                action,
                interval: methodOptions?.interval,
                maxExecutions: methodOptions?.maxExecutions,
                immediate: methodOptions?.immediate,
                onExecution: methodOptions?.onExecution,
                onComplete: methodOptions?.onComplete
            };

            return await activity.execute(context);
        };

        return descriptor;
    };
}

export function createIntervalDecorator() {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const activity = new IntervalActivity();

        descriptor.value = async function (
            action: Activity,
            options?: {
                interval?: number;
                maxExecutions?: number;
                immediate?: boolean;
                onExecution?: (execution: number, result: any) => void;
                onComplete?: () => void;
            }
        ) {
            const context: IntervalActivityContext = {
                action,
                interval: options?.interval,
                maxExecutions: options?.maxExecutions,
                immediate: options?.immediate,
                onExecution: options?.onExecution,
                onComplete: options?.onComplete
            };

            return await activity.execute(context);
        };

        return descriptor;
    };
} 