import { createDecorator } from '@tsdi/ioc';
import { DelayActivityOptions } from '../activities/Delay';



export const Delay = createDecorator<DelayActivityOptions>('Delay', {}); 

// export function Delay(options: DelayDecoratorOptions = {}) {
//     return function (
//         target: any,
//         propertyKey: string,
//         descriptor: PropertyDescriptor
//     ) {
//         const originalMethod = descriptor.value;
//         const activity = new DelayActivity(options);

//         descriptor.value = async function (
//             delay: number,
//             methodOptions?: {
//                 interruptible?: boolean;
//                 onComplete?: () => void;
//             }
//         ) {
//             const context: DelayActivityContext = {
//                 delay,
//                 interruptible: methodOptions?.interruptible,
//                 onComplete: methodOptions?.onComplete
//             };

//             return await activity.execute(context);
//         };

//         return descriptor;
//     };
// } 