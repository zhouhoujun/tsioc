import { Injectable } from '@tsdi/ioc';
import { Sequence, Workflow } from '../decorators';
import { WorkflowService } from '../services';
import { Activity, ActivityContext, ActivityResult, EndActivity, SequenceActivity, StartActivity } from '../activities';

@Injectable()
class ValidateActivity implements Activity {
    name = 'validate';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟验证逻辑
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { validated: true }
        };
    }
}

@Injectable()
class ProcessActivity implements Activity {
    name = 'process';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟处理逻辑
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            success: true,
            data: { processed: true }
        };
    }
}

@Workflow({
    name: 'sequential_processing_workflow',
    activities: [
        StartActivity,
        SequenceActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'sequence' },
        { from: 'sequence', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class SequentialProcessingWorkflow {
    @Sequence({
        defaultContinueOnError: false
    })
    sequence!: SequenceActivity;
}

@Injectable()
export class DataProcessor {
    constructor(private workflowService: WorkflowService) {}

    async processData() {
        const context = {
            activities: [
                new ValidateActivity(),
                new ProcessActivity()
            ],
            continueOnError: false,
            onActivityComplete: (activity: Activity, result: ActivityResult) => {
                console.log(`Activity ${activity.name} completed:`, result);
            },
            errorHandler: async (activity: Activity, error: Error) => {
                console.error(`Error in activity ${activity.name}:`, error);
                return {
                    success: false,
                    error,
                    data: { handled: true }
                };
            }
        };

        const result = await this.workflowService.startWorkflow(
            SequentialProcessingWorkflow,
            context
        );

        return result;
    }
} 