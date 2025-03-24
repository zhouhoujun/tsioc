import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Process } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class DataValidationActivity implements Activity {
    name = 'validate_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        const { data } = context;
        
        if (!data || typeof data !== 'object') {
            return {
                success: false,
                error: new Error('Invalid data format')
            };
        }

        return {
            success: true,
            data: { validated: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'DataProcessingWorkflow',
    description: '使用 Process 装饰器的工作流示例'
})
export class DataProcessingWorkflow {
    @Process({
        defaultOptions: {
            throwOnValidationError: true,
            continueOnError: false,
            batchSize: 100,
            timeout: 30000
        }
    })
    async processData(
        data: any,
        processor: (data: any, context: ActivityContext) => Promise<any>,
        options?: {
            validator?: (data: any) => Promise<boolean>;
            onProgress?: (progress: number, current: number, total: number) => void;
            errorHandler?: (error: Error, data: any) => Promise<ActivityResult>;
            throwOnValidationError?: boolean;
            continueOnError?: boolean;
            batchSize?: number;
            timeout?: number;
        }
    ) {
        return { data, processor, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: DataProcessingWorkflow) {}

    async processData() {
        const validator = new DataValidationActivity();

        return await this.workflow.processData(
            // 测试数据
            [
                { id: 1, value: 'test1' },
                { id: 2, value: 'test2' },
                { id: 3, value: 'test3' }
            ],
            // 处理函数
            async (item, context) => {
                // 模拟数据处理
                await new Promise(resolve => setTimeout(resolve, 1000));
                return {
                    ...item,
                    processed: true,
                    timestamp: Date.now()
                };
            },
            {
                // 验证器
                validator: async (data) => {
                    const result = await validator.execute({ data });
                    return result.success;
                },
                // 进度回调
                onProgress: (progress, current, total) => {
                    console.log(`Processing progress: ${progress}% (${current}/${total})`);
                },
                // 错误处理
                errorHandler: async (error, data) => {
                    console.error('Processing error:', error);
                    return {
                        success: false,
                        error,
                        data: { failed: true }
                    };
                },
                // 处理选项
                batchSize: 2,
                timeout: 5000,
                continueOnError: true
            }
        );
    }

    async processLargeDataset() {
        // 生成测试数据
        const testData = Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            value: `test${i + 1}`
        }));

        return await this.workflow.processData(
            testData,
            async (item, context) => {
                // 模拟数据处理
                await new Promise(resolve => setTimeout(resolve, 100));
                return {
                    ...item,
                    processed: true,
                    timestamp: Date.now()
                };
            },
            {
                batchSize: 50,
                onProgress: (progress, current, total) => {
                    console.log(`Large dataset progress: ${progress}% (${current}/${total})`);
                }
            }
        );
    }
} 