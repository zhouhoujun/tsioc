import { createDecorator } from '@tsdi/ioc';
import { WorkflowDefinition } from '../Workflow';


export const Workflow = createDecorator<Partial<WorkflowDefinition>>('Workflow', {});

// export function Workflow(options: WorkflowOptions = {}) {
//     return function (target: any) {
//         // 添加元数据
//         Reflect.defineMetadata('workflow', {
//             name: options.name || target.name,
//             description: options.description,
//             version: options.version || '1.0.0',
//             enableHistory: options.enableHistory ?? true,
//             enableMonitoring: options.enableMonitoring ?? true
//         }, target);

//         // 验证类是否实现了必要的方法
//         const prototype = target.prototype;
//         const requiredMethods = ['execute', 'compensate'];

//         requiredMethods.forEach(method => {
//             if (typeof prototype[method] !== 'function') {
//                 throw new Error(`Workflow class must implement ${method} method`);
//             }
//         });

//         // 添加 Injectable 装饰器
//         Injectable()(target);

//         return target;
//     };
// } 