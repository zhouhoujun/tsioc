import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { TryCatchActivity } from '../activities/TryCatch';
import { EndActivity } from '../activities/BaseActivities';
import { WorkflowService } from '../services/workflow.service';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { StartActivity } from '../activities/BaseActivities';
import { TryCatch } from '../decorators/try-catch.decorator';

@Injectable()
class RiskyOperationActivity implements Activity {
    name = 'risky_operation';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟可能失败的操作
        if (Math.random() > 0.5) {
            throw new Error('Operation failed');
        }
        return {
            success: true,
            data: { completed: true }
        };
    }
}

@Injectable()
class ErrorHandlingActivity implements Activity {
    name = 'error_handling';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        const error = context.error as Error;
        console.error('Handling error:', error.message);
        return {
            success: true,
            data: { handled: true, error: error.message }
        };
    }
}

@Workflow({
    name: 'error_handling_workflow',
    activities: [
        StartActivity,
        TryCatchActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'try_catch' },
        { from: 'try_catch', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ErrorHandlingWorkflow {
    @TryCatch({
        defaultErrorTypes: [Error],
        defaultRethrow: false
    })
    tryCatch!: TryCatchActivity;
}

@Injectable()
export class ErrorHandler {
    constructor(private workflowService: WorkflowService) {}

    async handleRiskyOperation() {
        const context = {
            tryActivity: new RiskyOperationActivity(),
            catchActivity: new ErrorHandlingActivity(),
            errorTypes: [Error],
            errorHandler: async (error: Error) => {
                console.error('Custom error handling:', error);
                return {
                    success: true,
                    data: { customHandled: true }
                };
            },
            rethrow: false
        };

        const result = await this.workflowService.startWorkflow(
            ErrorHandlingWorkflow,
            context
        );

        return result;
    }
} 