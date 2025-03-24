import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Switch } from '../decorators';
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

class ErrorActivity implements Activity {
    name = 'error';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: false,
            error: new Error('Processing error')
        };
    }
}

// 工作流类
@Workflow({
    name: 'SwitchProcessingWorkflow',
    description: '使用 Switch 装饰器的工作流示例'
})
export class SwitchProcessingWorkflow {
    @Switch()
    async switchProcess(
        cases: {
            condition: (context: ActivityContext) => Promise<boolean>;
            activity: Activity;
        }[],
        defaultActivity?: Activity,
        options?: {
            onCase?: (index: number, result: ActivityResult) => void;
            onComplete?: () => void;
        }
    ) {
        return { cases, defaultActivity, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: SwitchProcessingWorkflow) {}

    async processWithSwitch() {
        const processActivity = new ProcessActivity();
        const skipActivity = new SkipActivity();
        const errorActivity = new ErrorActivity();

        // 示例：多条件处理
        const result = await this.workflow.switchProcess(
            [
                {
                    condition: async (context) => {
                        return Math.random() > 0.7; // 30%概率
                    },
                    activity: processActivity
                },
                {
                    condition: async (context) => {
                        return Math.random() > 0.5; // 50%概率
                    },
                    activity: skipActivity
                },
                {
                    condition: async (context) => {
                        return Math.random() > 0.3; // 70%概率
                    },
                    activity: errorActivity
                }
            ],
            skipActivity, // 默认活动
            {
                onCase: (index, result) => {
                    console.log(`Case ${index} executed:`, result);
                },
                onComplete: () => {
                    console.log('Switch processing completed');
                }
            }
        );

        return result;
    }
} 