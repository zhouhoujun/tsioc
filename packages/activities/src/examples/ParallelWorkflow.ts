import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Parallel } from '../decorators';
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

class DataProcessActivity implements Activity {
    name = 'process_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟数据处理
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            success: true,
            data: { processed: true }
        };
    }
}

class DataValidateActivity implements Activity {
    name = 'validate_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟数据验证
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            success: true,
            data: { validated: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'ParallelProcessingWorkflow',
    description: '使用 Parallel 装饰器的工作流示例'
})
export class ParallelProcessingWorkflow {
    @Parallel({
        defaultMaxConcurrent: 3,
        defaultErrorStrategy: 'continue'
    })
    async executeParallel(
        activities: Activity[],
        options?: {
            maxConcurrent?: number;
            waitAll?: boolean;
            onActivityComplete?: (activity: Activity, result: ActivityResult) => void;
            errorStrategy?: 'continue' | 'stop' | 'throw';
        }
    ) {
        return { activities, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: ParallelProcessingWorkflow) {}

    async processData() {
        const fetchActivity = new DataFetchActivity();
        const processActivity = new DataProcessActivity();
        const validateActivity = new DataValidateActivity();

        return await this.workflow.executeParallel(
            [fetchActivity, processActivity, validateActivity],
            {
                maxConcurrent: 3,
                waitAll: true,
                onActivityComplete: (activity: Activity, result: ActivityResult) => {
                    console.log(`Activity ${activity.name} completed:`, result);
                },
                errorStrategy: 'continue'
            }
        );
    }
} 