import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface ProcessActivityContext extends ActivityContext {
    /**
     * 要处理的数据
     */
    data?: any;
    /**
     * 处理函数
     */
    processor?: (data: any, context: ActivityContext) => Promise<any>;
    /**
     * 进度回调函数
     */
    onProgress?: (progress: number, current: number, total: number) => void;
    /**
     * 错误处理函数
     */
    errorHandler?: (error: Error, data: any) => Promise<ActivityResult>;
    /**
     * 验证函数
     */
    validator?: (data: any) => Promise<boolean>;
    /**
     * 处理选项
     */
    options?: {
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
    };
}

export interface ProcessActivityOptions {
    /**
     * 默认处理选项
     */
    defaultOptions?: {
        throwOnValidationError: boolean;
        continueOnError: boolean;
        batchSize: number;
        timeout: number;
    };
}

interface ProcessOptions {
    throwOnValidationError: boolean;
    continueOnError: boolean;
    batchSize: number;
    timeout: number;
}

@Injectable()
export class ProcessActivity implements Activity<ProcessActivityContext> {
    name = 'process';

    constructor(private options: ProcessActivityOptions = {}) {
        this.options = {
            defaultOptions: {
                throwOnValidationError: true,
                continueOnError: false,
                batchSize: 100,
                timeout: 30000,
                ...options.defaultOptions
            },
            ...options
        };
    }

    async execute(context: ProcessActivityContext): Promise<ActivityResult> {
        if (!context.data) {
            return {
                success: false,
                error: new Error('No data provided for processing')
            };
        }

        const options: ProcessOptions = {
            throwOnValidationError: true,
            continueOnError: false,
            batchSize: 100,
            timeout: 30000,
            ...this.options.defaultOptions,
            ...context.options
        };

        try {
            // 验证数据
            if (context.validator) {
                const isValid = await context.validator(context.data);
                if (!isValid) {
                    if (options.throwOnValidationError) {
                        throw new Error('Data validation failed');
                    }
                    return {
                        success: false,
                        error: new Error('Data validation failed'),
                        data: { validationFailed: true }
                    };
                }
            }

            // 处理数据
            const result = await this.processData(context, options);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            // 如果有自定义错误处理器，使用它
            if (context.errorHandler) {
                try {
                    return await context.errorHandler(error as Error, context.data);
                } catch (handlerError) {
                    return {
                        success: false,
                        error: handlerError as Error,
                        data: {
                            originalError: error,
                            handlerError: handlerError
                        }
                    };
                }
            }

            return {
                success: false,
                error: error as Error,
                data: {
                    processed: false,
                    error: error as Error
                }
            };
        }
    }

    private async processData(
        context: ProcessActivityContext,
        options: ProcessOptions
    ): Promise<any> {
        const { data, processor, onProgress } = context;

        if (!processor) {
            return data;
        }

        // 如果是数组，进行批处理
        if (Array.isArray(data)) {
            return this.processBatch(data, context, options);
        }

        // 单个数据处理
        return this.processWithTimeout(processor, data, context, options.timeout);
    }

    private async processBatch(
        items: any[],
        context: ProcessActivityContext,
        options: ProcessOptions
    ): Promise<any[]> {
        const { processor, onProgress } = context;
        const { batchSize, timeout, continueOnError } = options;
        const results: any[] = [];
        const errors: Error[] = [];
        const total = items.length;

        for (let i = 0; i < total; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchPromises = batch.map(async (item, index) => {
                try {
                    const result = await this.processWithTimeout(
                        processor!,
                        item,
                        context,
                        timeout
                    );

                    const current = i + index + 1;
                    onProgress?.(Math.round((current / total) * 100), current, total);

                    return result;
                } catch (error) {
                    if (continueOnError) {
                        errors.push(error as Error);
                        return null;
                    }
                    throw error;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(result => result !== null));
        }

        if (errors.length > 0) {
            return {
                results,
                errors,
                partialSuccess: true
            } as any;
        }

        return results;
    }

    private async processWithTimeout(
        processor: (data: any, context: ActivityContext) => Promise<any>,
        data: any,
        context: ActivityContext,
        timeout: number
    ): Promise<any> {
        if (timeout <= 0) {
            return processor(data, context);
        }

        return Promise.race([
            processor(data, context),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Processing timeout after ${timeout}ms`));
                }, timeout);
            })
        ]);
    }

    async compensate(context: ProcessActivityContext): Promise<void> {
        // 如果需要，实现补偿逻辑
        // 例如：清理临时文件、回滚数据库事务等
    }
} 