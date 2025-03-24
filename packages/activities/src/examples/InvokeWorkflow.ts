import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Invoke } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class DataFetchActivity implements Activity {
    name = 'fetch_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟数据获取
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { fetched: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'InvokeProcessingWorkflow',
    description: '使用 Invoke 装饰器的工作流示例'
})
export class InvokeProcessingWorkflow {
    @Invoke({
        defaultRetry: {
            maxAttempts: 3,
            delay: 1000,
            backoff: 2
        }
    })
    async invokeActivity(
        target: Activity | ((context: ActivityContext, ...args: any[]) => Promise<any>),
        options?: {
            args?: any[];
            resultMapper?: (result: any) => any;
            errorHandler?: (error: Error) => Promise<ActivityResult>;
            retry?: {
                maxAttempts: number;
                delay: number;
                backoff?: number;
            };
        }
    ) {
        return { target, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: InvokeProcessingWorkflow) {}

    async processData() {
        const fetchActivity = new DataFetchActivity();

        // 示例1：调用活动
        const result1 = await this.workflow.invokeActivity(
            fetchActivity,
            {
                retry: {
                    maxAttempts: 3,
                    delay: 1000,
                    backoff: 2
                },
                errorHandler: async (error) => {
                    console.error('Activity execution failed:', error);
                    return {
                        success: false,
                        error,
                        data: { handled: true }
                    };
                }
            }
        );

        // 示例2：调用函数
        const result2 = await this.workflow.invokeActivity(
            async (context, data) => {
                // 模拟数据处理
                await new Promise(resolve => setTimeout(resolve, 1000));
                return {
                    processed: true,
                    data
                };
            },
            {
                args: [{ id: 1, value: 'test' }],
                resultMapper: (result) => ({
                    ...result,
                    timestamp: Date.now()
                })
            }
        );

        return { result1, result2 };
    }
} 