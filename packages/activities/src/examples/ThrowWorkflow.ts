import { Injectable } from '@tsdi/ioc';
import { Workflow, Throw } from '../decorators';
import { Activity, ActivityContext, ActivityResult, EndActivity, StartActivity, ThrowActivity } from '../activities';
import { WorkflowService } from '../services/workflow.service';


@Injectable()
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

@Workflow({
    name: 'validation_workflow',
    activities: [
        StartActivity,
        ValidationActivity,
        ThrowActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'validate' },
        { 
            from: 'validate', 
            to: 'throw',
            condition: (ctx: ActivityContext) => !ctx.validated 
        },
        { 
            from: 'validate', 
            to: 'end',
            condition: (ctx: ActivityContext) => ctx.validated 
        },
        { from: 'throw', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ValidationWorkflow {
    @Throw({
        defaultErrorCode: 'VALIDATION_ERROR'
    })
    throw!: ThrowActivity;
}

@Injectable()
export class ValidationService {
    constructor(private workflowService: WorkflowService) {}

    async validateData(data: any) {
        const context = {
            data,
            error: new Error('Invalid data format'),
            code: 'INVALID_FORMAT',
            details: {
                field: 'data',
                reason: 'format_mismatch',
                received: data
            },
            compensateBeforeThrow: true
        };

        const result = await this.workflowService.startWorkflow(
            ValidationWorkflow,
            context
        );

        return result;
    }
} 