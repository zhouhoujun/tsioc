import { createDecorator } from '@tsdi/ioc';
import { SwitchActivityOptions } from '../activities/Switch';
import { CaseActivityOptions } from '../activities/Case';

export const Switch = createDecorator<SwitchActivityOptions>('Switch', {}); 

export const Case = createDecorator<CaseActivityOptions>('Case', {}); 

// export function Switch(options: SwitchActivityOptions = {}) {
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//         const originalMethod = descriptor.value;

//         descriptor.value = async function (...args: any[]) {
//             const activity = new SwitchActivity(options);
//             const context: SwitchActivityContext = {
//                 cases: args[0] || [],
//                 defaultActivity: args[1],
//                 breakOnMatch: args[2]?.breakOnMatch,
//                 errorHandler: args[2]?.errorHandler
//             };

//             // 验证参数
//             if (!Array.isArray(context.cases)) {
//                 throw new Error('First argument must be an array of CaseActivity instances');
//             }

//             if (context.cases.length === 0 && !context.defaultActivity) {
//                 throw new Error('At least one case or a default activity must be provided');
//             }

//             // 验证所有 case 活动
//             context.cases.forEach((caseActivity, index) => {
//                 if (!(caseActivity instanceof CaseActivity)) {
//                     throw new Error(`Case at index ${index} must be a CaseActivity instance`);
//                 }
//             });

//             return await activity.execute(context);
//         };

//         return descriptor;
//     };
// }

// export function Case(options: CaseActivityOptions = {}) {
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//         const originalMethod = descriptor.value;

//         descriptor.value = async function (...args: any[]) {
//             if (!args[0] || typeof args[0].execute !== 'function') {
//                 throw new Error('First argument must be an Activity instance');
//             }

//             const activity = new CaseActivity(
//                 async (ctx: any) => {
//                     try {
//                         return await originalMethod.apply(this, [ctx.data]);
//                     } catch (error) {
//                         console.error(`Error in case condition: ${error}`);
//                         return false;
//                     }
//                 },
//                 args[0],
//                 options
//             );

//             return activity;
//         };

//         return descriptor;
//     };
// } 