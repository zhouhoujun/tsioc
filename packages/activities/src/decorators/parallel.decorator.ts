import { createDecorator } from '@tsdi/ioc';
import { ParallelActivityOptions } from '../activities/Parallel';



export const Parallel = createDecorator<ParallelActivityOptions>('Parallel', {}); 

// export function Parallel(options: ParallelActivityOptions = {}) {
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//         const originalMethod = descriptor.value;

//         descriptor.value = async function (...args: any[]) {
//             const activity = new ParallelActivity(options);
//             const context: ParallelActivityContext = {
//                 activities: args[0],
//                 maxConcurrent: args[1]?.maxConcurrent,
//                 waitAll: args[1]?.waitAll,
//                 onActivityComplete: args[1]?.onActivityComplete,
//                 errorStrategy: args[1]?.errorStrategy
//             };

//             // 验证参数
//             if (!Array.isArray(context.activities)) {
//                 throw new Error('First argument must be an array of Activity instances');
//             }

//             if (context.activities.length === 0) {
//                 throw new Error('Activities array cannot be empty');
//             }

//             // 验证所有活动
//             context.activities.forEach((activity, index) => {
//                 if (!activity || typeof activity.execute !== 'function') {
//                     throw new Error(`Activity at index ${index} must be a valid Activity instance`);
//                 }
//             });

//             // 验证错误策略
//             if (context.errorStrategy && !['continue', 'stop', 'throw'].includes(context.errorStrategy)) {
//                 throw new Error('Error strategy must be one of: continue, stop, throw');
//             }

//             return await activity.execute(context);
//         };

//         return descriptor;
//     };
// } 