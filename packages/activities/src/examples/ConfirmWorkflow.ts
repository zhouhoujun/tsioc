import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Confirm } from '../decorators';
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
    name: 'ConfirmProcessingWorkflow',
    description: '使用 Confirm 装饰器的工作流示例'
})
export class ConfirmProcessingWorkflow {
    @Confirm({
        defaultMessage: 'Please confirm this action',
        defaultTimeout: 30000 // 30秒
    })
    async confirmAction(
        message: string,
        options?: {
            timeout?: number;
            onConfirmed?: (result: ActivityResult) => void;
            onRejected?: (reason: string) => void;
            onTimeout?: () => void;
        }
    ) {
        return { message, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: ConfirmProcessingWorkflow) {}

    async processWithConfirmation() {
        const processActivity = new DataProcessActivity();

        // 示例1：基本确认
        const result1 = await this.workflow.confirmAction(
            'Do you want to process this data?',
            {
                onConfirmed: (result) => {
                    console.log('Action confirmed:', result);
                },
                onRejected: (reason) => {
                    console.log('Action rejected:', reason);
                }
            }
        );

        // 示例2：带超时的确认
        const result2 = await this.workflow.confirmAction(
            'Please confirm within 10 seconds',
            {
                timeout: 10000,
                onTimeout: () => {
                    console.log('Confirmation timed out');
                }
            }
        );

        return { result1, result2 };
    }
} 