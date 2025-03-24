import { TimerActivity, TimerActivityContext, TimerActivityOptions } from '../activities/TimerActivity';
import { Activity } from '../activities/Activity';

export function Timer(options: TimerActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new TimerActivity(options);
            const context: TimerActivityContext = {
                type: args[0],
                delay: args[1],
                targetDate: args[2],
                interval: args[3],
                maxRepeats: args[4],
                callback: args[5],
                immediate: args[6],
                onComplete: args[7]
            };

            // 验证参数
            if (!context.type || !['timeout', 'interval', 'date'].includes(context.type)) {
                throw new Error('First argument must be a valid timer type: timeout, interval, or date');
            }

            if (context.type === 'date' && !context.targetDate) {
                throw new Error('Target date is required for date timer type');
            }

            if ((context.type === 'timeout' || context.type === 'interval') && !context.delay) {
                throw new Error('Delay is required for timeout and interval timer types');
            }

            if (context.type === 'interval' && context.maxRepeats !== undefined && context.maxRepeats < 0) {
                throw new Error('Max repeats must be a non-negative number');
            }

            return await activity.execute(context);
        };

        return descriptor;
    };
} 