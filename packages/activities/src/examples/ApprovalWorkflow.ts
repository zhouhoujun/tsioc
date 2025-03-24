import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
class DataValidationActivity implements Activity {
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

class ApprovalActivity implements Activity {
    name = 'approve';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        const { data, approved, approver } = context;
        
        if (!approved) {
            return {
                success: false,
                error: new Error('Approval rejected')
            };
        }

        return {
            success: true,
            data: { 
                approved: true,
                approver,
                timestamp: Date.now()
            }
        };
    }
}

// 工作流类
@Workflow({
    name: 'ApprovalProcessingWorkflow',
    description: '使用 Approval 装饰器的工作流示例'
})
export class ApprovalProcessingWorkflow {
    async requestApproval(
        data: any,
        approver: string | string[],
        options?: {
            timeout?: number;
            autoApprove?: boolean;
            onApproved?: (result: ActivityResult) => void;
            onRejected?: (reason: string) => void;
            onTimeout?: () => void;
        }
    ) {
        const validationActivity = new DataValidationActivity();
        const approvalActivity = new ApprovalActivity();

        // 先执行验证
        const validationResult = await validationActivity.execute({ data });
        if (!validationResult.success) {
            return validationResult;
        }

        // 执行审批
        return await approvalActivity.execute({
            data,
            approved: options?.autoApprove ?? false,
            approver: Array.isArray(approver) ? approver[0] : approver
        });
    }
}

// 服务类
export class ApprovalService {
    constructor(private workflow: ApprovalProcessingWorkflow) {}

    async processApproval() {
        // 示例1：单审批人
        const result1 = await this.workflow.requestApproval(
            { required: true },
            'admin@example.com',
            {
                timeout: 1800000, // 30分钟
                onApproved: (result) => {
                    console.log('Approval granted:', result);
                },
                onRejected: (reason) => {
                    console.log('Approval rejected:', reason);
                },
                onTimeout: () => {
                    console.log('Approval request timed out');
                }
            }
        );

        // 示例2：多审批人
        const result2 = await this.workflow.requestApproval(
            { required: true },
            ['manager1@example.com', 'manager2@example.com'],
            {
                autoApprove: true,
                timeout: 7200000, // 2小时
                onApproved: (result) => {
                    console.log('Multi-approval granted:', result);
                }
            }
        );

        return { result1, result2 };
    }
}
