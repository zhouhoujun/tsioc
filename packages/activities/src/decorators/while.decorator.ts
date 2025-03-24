import { WhileActivity, WhileActivityContext, WhileActivityOptions } from '../activities/While';

export function While(options: WhileActivityOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const activity = new WhileActivity(options);
            const context: WhileActivityContext = {
                condition: async (ctx: any) => {
                    return await originalMethod.apply(this, args);
                },
                body: args[0],
                maxIterations: args[1]?.maxIterations,
                interval: args[1]?.interval,
                onIteration: args[1]?.onIteration,
                errorHandler: args[1]?.errorHandler,
                continueOnError: args[1]?.continueOnError,
                throwOnConditionFalse: args[1]?.throwOnConditionFalse
            };

            return await activity.execute(context);
        };

        return descriptor;
    };
} 