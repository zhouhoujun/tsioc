import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Timer } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class DataCheckActivity implements Activity {
    name = 'check_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟数据检查
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { checked: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'ScheduledCheckWorkflow',
    description: '使用 Timer 装饰器的工作流示例'
})
export class ScheduledCheckWorkflow {
    @Timer({
        defaultDelay: 5000,
        defaultImmediate: false
    })
    async scheduleCheck(
        callback: (context: ActivityContext) => Promise<void>,
        options?: {
            type?: 'timeout' | 'interval' | 'date';
            delay?: number;
            targetDate?: Date;
            interval?: number;
            maxRepeats?: number;
            immediate?: boolean;
            onComplete?: () => void;
        }
    ) {
        return { callback, ...options };
    }
}

// 服务类
export class DataMonitor {
    constructor(private workflow: ScheduledCheckWorkflow) {}

    async startMonitoring() {
        const dataCheckActivity = new DataCheckActivity();

        return await this.workflow.scheduleCheck(
            async (context) => {
                console.log('Checking data...');
                const result = await dataCheckActivity.execute(context);
                console.log('Check result:', result);
            },
            {
                type: 'interval',
                interval: 30000, // 30秒
                maxRepeats: 10,  // 最多执行10次
                immediate: true,
                onComplete: () => {
                    console.log('Monitoring completed');
                }
            }
        );
    }

    async scheduleOneTimeCheck(targetDate: Date) {
        const dataCheckActivity = new DataCheckActivity();

        return await this.workflow.scheduleCheck(
            async (context) => {
                console.log('Executing scheduled check...');
                const result = await dataCheckActivity.execute(context);
                console.log('Check result:', result);
            },
            {
                type: 'date',
                targetDate,
                onComplete: () => {
                    console.log('Scheduled check completed');
                }
            }
        );
    }
} 
