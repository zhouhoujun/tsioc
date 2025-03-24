import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { If } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class ProcessActivity implements Activity {
    name = 'process';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟处理逻辑
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { processed: true }
        };
    }
}

class SkipActivity implements Activity {
    name = 'skip';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { skipped: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'IfProcessingWorkflow',
    description: '使用 If 装饰器的工作流示例'
})
export class IfProcessingWorkflow {
    @If()
    async ifProcess(
        condition: (context: ActivityContext) => Promise<boolean>,
        thenActivity: Activity,
        elseActivity?: Activity,
        options?: {
            onCondition?: (result: boolean) => void;
            onComplete?: () => void;
        }
    ) {
        return { condition, thenActivity, elseActivity, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: IfProcessingWorkflow) {}

    async processWithCondition() {
        const processActivity = new ProcessActivity();
        const skipActivity = new SkipActivity();

        // 示例1：条件处理
        const result1 = await this.workflow.ifProcess(
            async (context) => {
                return Math.random() > 0.5; // 随机条件
            },
            processActivity,
            skipActivity,
            {
                onCondition: (result) => {
                    console.log('Condition result:', result);
                },
                onComplete: () => {
                    console.log('Conditional processing completed');
                }
            }
        );

        // 示例2：无else分支
        const result2 = await this.workflow.ifProcess(
            async (context) => {
                return true; // 总是执行
            },
            processActivity,
            undefined,
            {
                onCondition: (result) => {
                    console.log('Condition result:', result);
                }
            }
        );

        return { result1, result2 };
    }
} 