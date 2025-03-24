import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { StartActivity, EndActivity } from '../activities/BaseActivities';
import { WorkflowService } from '../services/workflow.service';

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

@Workflow({
    name: 'approval_workflow',
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
export class ApprovalWorkflow {}
