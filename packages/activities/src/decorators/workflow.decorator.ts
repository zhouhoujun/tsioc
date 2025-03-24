import { Injectable } from '@tsdi/ioc';
import { Activity } from '../activities/Activity';

export interface WorkflowOptions {
    /**
     * 工作流名称
     */
    name?: string;
    /**
     * 工作流描述
     */
    description?: string;
    /**
     * 工作流版本
     */
    version?: string;
    /**
     * 是否启用工作流历史记录
     */
    enableHistory?: boolean;
    /**
     * 是否启用工作流监控
     */
    enableMonitoring?: boolean;
}

export function Workflow(options: WorkflowOptions = {}) {
    return function (target: any) {
        // 添加元数据
        Reflect.defineMetadata('workflow', {
            name: options.name || target.name,
            description: options.description,
            version: options.version || '1.0.0',
            enableHistory: options.enableHistory ?? true,
            enableMonitoring: options.enableMonitoring ?? true
        }, target);

        // 验证类是否实现了必要的方法
        const prototype = target.prototype;
        const requiredMethods = ['execute', 'compensate'];

        requiredMethods.forEach(method => {
            if (typeof prototype[method] !== 'function') {
                throw new Error(`Workflow class must implement ${method} method`);
            }
        });

        // 添加 Injectable 装饰器
        Injectable()(target);

        return target;
    };
} 