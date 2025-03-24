import { ProcessActivity, ProcessActivityContext, ProcessActivityOptions } from '../activities/Process';
import { Activity } from '../activities/Activity';

export function Process(options: ProcessActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new ProcessActivity(options);
            const context: ProcessActivityContext = {
                data: args[0],
                processor: args[1],
                onProgress: args[2]?.onProgress,
                errorHandler: args[2]?.errorHandler,
                validator: args[2]?.validator,
                options: args[2]?.options
            };

            // 验证参数
            if (context.data === undefined) {
                throw new Error('First argument must be the data to process');
            }

            if (typeof context.processor !== 'function') {
                throw new Error('Second argument must be a processor function');
            }

            return await activity.execute(context);
        };

        return descriptor;
    };
} 