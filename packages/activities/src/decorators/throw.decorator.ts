import { ThrowActivity, ThrowActivityContext, ThrowActivityOptions } from '../activities/Throw';
import { Activity } from '../activities/Activity';

export function Throw(options: ThrowActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new ThrowActivity(options);
            const context: ThrowActivityContext = {
                error: args[0],
                details: args[1],
                code: args[2],
                compensateBeforeThrow: args[3]
            };

            // 验证参数
            if (!context.error) {
                throw new Error('First argument must be an error or error message');
            }

            return await activity.execute(context);
        };

        return descriptor;
    };
} 