import { Injectable } from '@tsdi/ioc';
import { ProcessActivity, ProcessActivityContext, ProcessActivityOptions } from '../activities/Process';

export interface ProcessDecoratorOptions extends ProcessActivityOptions {
    /**
     * 是否在验证失败时抛出错误
     */
    throwOnValidationError?: boolean;
    /**
     * 是否在错误时继续处理
     */
    continueOnError?: boolean;
    /**
     * 批处理大小
     */
    batchSize?: number;
    /**
     * 处理超时时间（毫秒）
     */
    timeout?: number;
    /**
     * 是否显示进度
     */
    showProgress?: boolean;
    /**
     * 进度更新间隔（毫秒）
     */
    progressInterval?: number;
}

export function Process(options: ProcessDecoratorOptions = {}) {
    return function (target: any, propertyKey: string) {
        const activity = new ProcessActivity({
            defaultOptions: {
                throwOnValidationError: options.throwOnValidationError ?? true,
                continueOnError: options.continueOnError ?? false,
                batchSize: options.batchSize ?? 100,
                timeout: options.timeout ?? 30000,
                ...options.defaultOptions
            }
        });

        // 创建 getter 来获取活动实例
        Object.defineProperty(target, propertyKey, {
            get: function () {
                return activity;
            },
            enumerable: true,
            configurable: true
        });

        // 添加元数据
        Reflect.defineMetadata('activity', {
            type: 'process',
            name: propertyKey,
            options
        }, target, propertyKey);
    };
} 