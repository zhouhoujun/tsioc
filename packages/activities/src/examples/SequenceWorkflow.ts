import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Sequence } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class ValidateActivity implements Activity {
    name = 'validate';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟验证逻辑
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { validated: true }
        };
    }
}

class ProcessActivity implements Activity {
    name = 'process';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟处理逻辑
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            success: true,
            data: { processed: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'SequentialProcessingWorkflow',
    description: '使用 Sequence 装饰器的工作流示例'
})
export class SequentialProcessingWorkflow {
    @Sequence({
        defaultContinueOnError: false
    })
    async executeSequence(
        activities: Activity[],
        options?: {
            continueOnError?: boolean;
            onActivityComplete?: (activity: Activity, result: ActivityResult) => void;
            errorHandler?: (activity: Activity, error: Error) => Promise<ActivityResult>;
        }
    ) {
        return { activities, ...options };
    }
}

// 服务类
export class DataProcessor {
    constructor(private workflow: SequentialProcessingWorkflow) {}

    async processData() {
        const validateActivity = new ValidateActivity();
        const processActivity = new ProcessActivity();

        return await this.workflow.executeSequence(
            [validateActivity, processActivity],
            {
                continueOnError: false,
                onActivityComplete: (activity: Activity, result: ActivityResult) => {
                    console.log(`Activity ${activity.name} completed:`, result);
                },
                errorHandler: async (activity: Activity, error: Error) => {
                    console.error(`Error in activity ${activity.name}:`, error);
                    return {
                        success: false,
                        error,
                        data: { handled: true }
                    };
                }
            }
        );
    }
} 