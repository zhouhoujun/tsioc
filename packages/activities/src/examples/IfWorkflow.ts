import { Injectable } from '@tsdi/ioc';
import { If, Workflow } from '../decorators';
import { Activity, ActivityContext, EndActivity, IfActivity, StartActivity } from '../activities';
import { WorkflowService } from '../services';



@Workflow({
    name: 'conditional_workflow',
    activities: [
        StartActivity,
        IfActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'if' },
        { from: 'if', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ConditionalWorkflow {
    @If()
    ifCondition!: IfActivity;
}

@Injectable()
export class ConditionalService {
    constructor(private workflowService: WorkflowService) {}

    async executeConditionalWorkflow(
        condition: (context: ActivityContext) => Promise<boolean>,
        thenActivity: Activity,
        elseActivity?: Activity
    ) {
        const context = {
            condition,
            thenActivity,
            elseActivity,
            onCondition: (result: boolean) => {
                console.log('Condition result:', result);
            }
        };

        const result = await this.workflowService.startWorkflow(
            ConditionalWorkflow,
            context
        );

        return result;
    }
} 