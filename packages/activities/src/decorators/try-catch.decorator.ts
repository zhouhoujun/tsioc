import { TryCatchActivity, TryCatchActivityContext, TryCatchActivityOptions } from '../activities/TryCatch';
import { Activity } from '../activities/Activity';

export function TryCatch(options: TryCatchActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new TryCatchActivity(options);
            const context: TryCatchActivityContext = {
                tryActivity: args[0],
                catchActivity: args[1],
                finallyActivity: args[2],
                errorTypes: args[3]?.errorTypes,
                errorHandler: args[3]?.errorHandler,
                rethrow: args[3]?.rethrow
            };

            // 验证参数
            if (!context.tryActivity || typeof context.tryActivity.execute !== 'function') {
                throw new Error('First argument must be an Activity instance for try block');
            }

            if (context.catchActivity && typeof context.catchActivity.execute !== 'function') {
                throw new Error('Second argument must be an Activity instance for catch block');
            }

            if (context.finallyActivity && typeof context.finallyActivity.execute !== 'function') {
                throw new Error('Third argument must be an Activity instance for finally block');
            }

            return await activity.execute(context);
        };

        return descriptor;
    };
} 