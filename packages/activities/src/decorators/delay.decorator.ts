import { createDecorator } from '@tsdi/ioc';
import { DelayActivity, DelayActivityContext, DelayActivityOptions } from '../activities/Delay';

export interface DelayDecoratorOptions extends DelayActivityOptions {
    /**
     * 默认延迟时间（毫秒）
     */
    defaultDelay?: number;
    /**
     * 默认是否可中断
     */
    defaultInterruptible?: boolean;
}

export function Delay(options: DelayDecoratorOptions = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const activity = new DelayActivity(options);

        descriptor.value = async function (
            delay: number,
            methodOptions?: {
                interruptible?: boolean;
                onComplete?: () => void;
            }
        ) {
            const context: DelayActivityContext = {
                delay,
                interruptible: methodOptions?.interruptible,
                onComplete: methodOptions?.onComplete
            };

            return await activity.execute(context);
        };

        return descriptor;
    };
} 