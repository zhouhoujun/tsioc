import { SequenceActivity, SequenceActivityContext, SequenceActivityOptions } from '../activities/Sequence';
import { Activity } from '../activities/Activity';

export function Sequence(options: SequenceActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new SequenceActivity(options);
            const context: SequenceActivityContext = {
                activities: args[0],
                continueOnError: args[1]?.continueOnError,
                onActivityComplete: args[1]?.onActivityComplete,
                errorHandler: args[1]?.errorHandler
            };

            // 验证参数
            if (!Array.isArray(context.activities)) {
                throw new Error('First argument must be an array of Activity instances');
            }

            if (context.activities.length === 0) {
                throw new Error('Activities array cannot be empty');
            }

            // 验证所有活动
            context.activities.forEach((activity, index) => {
                if (!activity || typeof activity.execute !== 'function') {
                    throw new Error(`Activity at index ${index} must be a valid Activity instance`);
                }
            });

            return await activity.execute(context);
        };

        return descriptor;
    };
} 