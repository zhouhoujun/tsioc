import { IfActivity, IfActivityContext, IfActivityOptions } from '../activities/If';
import { Activity } from '../activities/Activity';

export function If(options: IfActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new IfActivity(options);
            const context: IfActivityContext = {
                condition: args[0],
                thenActivity: args[1],
                elseActivity: args[2],
                errorHandler: args[3]?.errorHandler
            };

            // 验证参数
            if (typeof context.condition !== 'function') {
                throw new Error('First argument must be a condition function');
            }

            if (!context.thenActivity || typeof context.thenActivity.execute !== 'function') {
                throw new Error('Second argument must be an Activity instance for then branch');
            }

            if (context.elseActivity && typeof context.elseActivity.execute !== 'function') {
                throw new Error('Third argument must be an Activity instance for else branch');
            }

            return await activity.execute(context);
        };

        return descriptor;
    };
} 