import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Delay } from '../decorators';
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
    name: 'DelayProcessingWorkflow',
    description: '使用 Delay 装饰器的工作流示例'
})
export class DelayProcessingWorkflow {
    @Delay({
        defaultDelay: 2000,
        defaultInterruptible: true
    })
    async waitBeforeProcess(
        delay: number,
        options?: {
            interruptible?: boolean;
            onComplete?: () => void;
        }
    ) {
        return { delay, ...options };
    }
}

// 服务类
export class ProcessingService {
    constructor(private workflow: DelayProcessingWorkflow) {}

    async processWithDelay() {
        const processActivity = new ProcessActivity();

        // 示例1：基本延迟
        const result1 = await this.workflow.waitBeforeProcess(3000, {
            onComplete: () => {
                console.log('Delay completed');
            }
        });

        // 示例2：不可中断的延迟
        const result2 = await this.workflow.waitBeforeProcess(5000, {
            interruptible: false,
            onComplete: () => {
                console.log('Non-interruptible delay completed');
            }
        });

        return { result1, result2 };
    }
} 