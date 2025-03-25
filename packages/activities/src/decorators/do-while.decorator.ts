import { createDecorator } from '@tsdi/ioc';
import { DoWhileActivityOptions } from '../activities/DoWhile';

export const DoWhile = createDecorator<DoWhileActivityOptions>('DoWhile', {}); 


// export interface DoWhileDecoratorOptions extends DoWhileActivityOptions {
//     /**
//      * 默认最大迭代次数
//      */
//     defaultMaxIterations?: number;
//     /**
//      * 默认迭代间隔
//      */
//     defaultInterval?: number;
//     /**
//      * 默认是否在错误时继续执行
//      */
//     defaultContinueOnError?: boolean;
// }

// export function DoWhile(options: DoWhileDecoratorOptions = {}) {
//     return function (
//         target: any,
//         propertyKey: string,
//         descriptor: PropertyDescriptor
//     ) {
//         const originalMethod = descriptor.value;
//         const activity = new DoWhileActivity(options);

//         descriptor.value = async function (
//             body: Activity,
//             condition: (context: ActivityContext) => Promise<boolean>,
//             methodOptions?: {
//                 maxIterations?: number;
//                 interval?: number;
//                 continueOnError?: boolean;
//                 onIteration?: (iteration: number, result: any) => void;
//                 errorHandler?: (error: Error, iteration: number) => Promise<any>;
//             }
//         ) {
//             const context: DoWhileActivityContext = {
//                 body,
//                 condition,
//                 maxIterations: methodOptions?.maxIterations,
//                 interval: methodOptions?.interval,
//                 continueOnError: methodOptions?.continueOnError,
//                 onIteration: methodOptions?.onIteration,
//                 errorHandler: methodOptions?.errorHandler
//             };

//             return await activity.execute(context);
//         };

//         return descriptor;
//     };
// } 