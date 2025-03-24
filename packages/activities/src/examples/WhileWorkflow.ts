import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { While } from '../decorators';
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

// 工作流类
@Workflow({
    name: 'WhileProcessingWorkflow',
    description: '使用 While 装饰器的工作流示例'
})
export class WhileProcessingWorkflow {
    @While({
        defaultMaxIterations: 10,
        defaultContinueOnError: false
    })
    async whileProcess(
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
    constructor(private workflow: WhileProcessingWorkflow) {}

    async processWithWhile() {
        const processActivity = new ProcessActivity();

        // 示例：处理数据直到条件满足
        let counter = 0;
        const result = await this.workflow.whileProcess(
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
                    console.log('While loop completed');
                }
            }
        );

        return result;
    }
} 