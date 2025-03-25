import { createDecorator } from '@tsdi/ioc';
import {  InvokeActivityOptions } from '../activities/Invoke';


export const Invoke = createDecorator<InvokeActivityOptions>('Invoke', {}); 

// export function Invoke(options: InvokeActivityOptions = {}) {
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//         const originalMethod = descriptor.value;

//         descriptor.value = async function (...args: any[]) {
//             const activity = new InvokeActivity(options);
//             const context: InvokeActivityContext = {
//                 target: args[0],
//                 args: args[1],
//                 resultMapper: args[2]?.resultMapper,
//                 errorHandler: args[2]?.errorHandler,
//                 retry: args[2]?.retry
//             };

//             // 验证参数
//             if (!context.target) {
//                 throw new Error('First argument must be an Activity instance or function');
//             }

//             // 验证重试配置
//             if (context.retry) {
//                 if (typeof context.retry.maxAttempts !== 'number' || context.retry.maxAttempts < 1) {
//                     throw new Error('Retry maxAttempts must be a positive number');
//                 }
//                 if (typeof context.retry.delay !== 'number' || context.retry.delay < 0) {
//                     throw new Error('Retry delay must be a non-negative number');
//                 }
//                 if (context.retry.backoff !== undefined && (typeof context.retry.backoff !== 'number' || context.retry.backoff < 1)) {
//                     throw new Error('Retry backoff must be a positive number');
//                 }
//             }

//             return await activity.execute(context);
//         };

//         return descriptor;
//     };
// } 