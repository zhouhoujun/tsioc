import { Injectable } from '@tsdi/ioc';
import { Process, Workflow } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { EndActivity, StartActivity } from '../activities';

@Injectable()
export class RequestApprovalActivity extends Activity {
    name = 'request_approval';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 实现请求审批逻辑
        return {
            success: true,
            data: { requestId: 'REQ-001' }
        };
    }
}

@Injectable()
export class ApprovalActivity extends Activity {
    name = 'approve';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 实现审批逻辑
        return {
            success: context.approved === true,
            data: { approvedBy: context.approver }
        };
    }

    async compensate(context: ActivityContext): Promise<void> {
        // 实现补偿逻辑
        console.log('Compensating approval...');
    }
}

// 工作流类
@Workflow({
    name: 'approval_workflow',
    description: '使用 Approval 装饰器的工作流示例',
    activities: [
        StartActivity,
        RequestApprovalActivity,
        ApprovalActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'request_approval' },
        { from: 'request_approval', to: 'approve' },
        { 
            from: 'approve', 
            to: 'end',
            condition: (ctx: ActivityContext) => ctx.approved === true 
        }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ApprovalProcessingWorkflow {

    @Process()
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
        // const validationActivity = new DataValidationActivity();
        // const approvalActivity = new ApprovalActivity();

        // // 先执行验证
        // const validationResult = await validationActivity.execute({ data });
        // if (!validationResult.success) {
        //     return validationResult;
        // }

        // 执行审批
        // return await approvalActivity.execute({
        //     data,
        //     approved: options?.autoApprove ?? false,
        //     approver: Array.isArray(approver) ? approver[0] : approver
        // });
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
