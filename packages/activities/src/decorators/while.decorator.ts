import { WhileActivity, WhileActivityContext, WhileActivityOptions } from '../activities/While';
import { Activity } from '../activities/Activity';

export function While(options: WhileActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new WhileActivity(options);
            const context: WhileActivityContext = {
                condition: args[0],
                body: args[1],
                maxIterations: args[2]?.maxIterations,
                interval: args[2]?.interval,
                onIteration: args[2]?.onIteration,
                errorHandler: args[2]?.errorHandler,
                continueOnError: args[2]?.continueOnError,
                throwOnConditionFalse: args[2]?.throwOnConditionFalse
            };

            // 验证参数
            if (typeof context.condition !== 'function') {
                throw new Error('First argument must be a condition function');
            }

            if (!context.body || typeof context.body.execute !== 'function') {
                throw new Error('Second argument must be an Activity instance for loop body');
            }

            return await activity.execute(context);
        };

        return descriptor;
    };
} 