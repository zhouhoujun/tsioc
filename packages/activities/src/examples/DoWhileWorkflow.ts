import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { DoWhile } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class DataProcessActivity implements Activity {
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

// 工作流类
@Workflow({
    name: 'DoWhileProcessingWorkflow',
    description: '使用 DoWhile 装饰器的工作流示例'
})
export class DoWhileProcessingWorkflow {
    @DoWhile({
        defaultMaxIterations: 10,
        defaultContinueOnError: false
    })
    async doWhileProcess(
        condition: (context: ActivityContext) => Promise<boolean>,
        body: Activity,
        options?: {
            maxIterations?: number;
            continueOnError?: boolean;
            onIteration?: (iteration: number, result: ActivityResult) => void;
            onComplete?: () => void;
        }
    ) {
        return { condition, body, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: DoWhileProcessingWorkflow) {}

    async processWithDoWhile() {
        const processActivity = new DataProcessActivity();

        // 示例：处理数据直到条件满足
        let counter = 0;
        const result = await this.workflow.doWhileProcess(
            async (context) => {
                counter++;
                return counter < 3; // 执行3次
            },
            processActivity,
            {
                maxIterations: 5,
                onIteration: (iteration, result) => {
                    console.log(`Iteration ${iteration} completed:`, result);
                },
                onComplete: () => {
                    console.log('Do-while loop completed');
                }
            }
        );

        return result;
    }
} 