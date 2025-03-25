import { createDecorator } from '@tsdi/ioc';
import { ConfirmActivity, ConfirmActivityContext, ConfirmActivityOptions } from '../activities/Confirm';

export interface ConfirmDecoratorOptions extends Partial<ConfirmActivityOptions> {
    
}

export const Confirm = createDecorator<ConfirmDecoratorOptions>('Confirm', {})

// export function Confirm(options: ConfirmDecoratorOptions = {}) {
//     return function (
//         target: any,
//         propertyKey: string,
//         descriptor: PropertyDescriptor
//     ) {
//         const originalMethod = descriptor.value;
//         const activity = new ConfirmActivity(options as ConfirmActivityOptions);

//         descriptor.value = async function (
//             message: string,
//             methodOptions?: {
//                 confirmText?: string;
//                 cancelText?: string;
//                 timeout?: number;
//                 defaultChoice?: boolean;
//                 onConfirm?: (confirmed: boolean) => void;
//                 onTimeout?: () => void;
//                 errorHandler?: (error: Error) => Promise<any>;
//             }
//         ) {
//             const context: ConfirmActivityContext = {
//                 message,
//                 options: {
//                     confirmText: methodOptions?.confirmText,
//                     cancelText: methodOptions?.cancelText,
//                     timeout: methodOptions?.timeout,
//                     defaultChoice: methodOptions?.defaultChoice
//                 },
//                 onConfirm: methodOptions?.onConfirm,
//                 onTimeout: methodOptions?.onTimeout,
//                 errorHandler: methodOptions?.errorHandler
//             };

//             return await activity.execute(context);
//         };

//         return descriptor;
//     };
// } 