import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Throw } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class ValidationActivity implements Activity {
    name = 'validate';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        const { data } = context;
        
        if (!data || !data.required) {
            return {
                success: false,
                error: new Error('Validation failed')
            };
        }

        return {
            success: true,
            data: { validated: true }
        };
    }
}

// 工作流类
@Workflow({
    name: 'ValidationWorkflow',
    description: '使用 Throw 装饰器的工作流示例'
})
export class ValidationWorkflow {
    @Throw({
        defaultErrorCode: 'VALIDATION_ERROR'
    })
    async validateAndThrow(
        error: Error | string,
        options?: {
            code?: string | number;
            details?: any;
            compensateBeforeThrow?: boolean;
        }
    ) {
        return { error, ...options };
    }
}

// 服务类
export class ValidationService {
    constructor(private workflow: ValidationWorkflow) {}

    async validateData(data: any) {
        const validationActivity = new ValidationActivity();
        
        // 先执行验证
        const validationResult = await validationActivity.execute({ data });
        
        if (!validationResult.success) {
            // 如果验证失败，抛出错误
            return await this.workflow.validateAndThrow(
                new Error('Invalid data format'),
                {
                    code: 'INVALID_FORMAT',
                    details: {
                        field: 'data',
                        reason: 'format_mismatch',
                        received: data
                    },
                    compensateBeforeThrow: true
                }
            );
        }

        return validationResult;
    }
} 