import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { TryCatch } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class RiskyOperationActivity implements Activity {
    name = 'risky_operation';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟可能失败的操作
        if (Math.random() > 0.5) {
            throw new Error('Operation failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { completed: true }
        };
    }
}

class ErrorHandlingActivity implements Activity {
    name = 'error_handler';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        const { error } = context;
        console.error('Handling error:', error);
        
        return {
            success: true,
            data: { error: error?.message }
        };
    }
}

class CleanupActivity implements Activity {
    name = 'cleanup';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟清理操作
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            success: true,
            data: { cleaned: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'TryCatchProcessingWorkflow',
    description: '使用 TryCatch 装饰器的工作流示例'
})
export class TryCatchProcessingWorkflow {
    @TryCatch()
    async tryCatchProcess(
        tryActivity: Activity,
        catchActivity: Activity,
        finallyActivity?: Activity,
        options?: {
            onError?: (error: Error) => void;
            onComplete?: () => void;
        }
    ) {
        return { tryActivity, catchActivity, finallyActivity, ...options };
    }
}

// 服务类
export class DataProcessingService {
    constructor(private workflow: TryCatchProcessingWorkflow) {}

    async processWithErrorHandling() {
        const riskyActivity = new RiskyOperationActivity();
        const errorActivity = new ErrorHandlingActivity();
        const cleanupActivity = new CleanupActivity();

        // 示例：错误处理流程
        const result = await this.workflow.tryCatchProcess(
            riskyActivity,
            errorActivity,
            cleanupActivity,
            {
                onError: (error) => {
                    console.log('Error occurred:', error);
                },
                onComplete: () => {
                    console.log('Try-catch processing completed');
                }
            }
        );

        return result;
    }
} 