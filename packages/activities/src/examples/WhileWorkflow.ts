import { Injectable } from '@tsdi/ioc';
import { Workflow, While } from '../decorators';
import { Activity, ActivityContext, ActivityResult, EndActivity, StartActivity, WhileActivity } from '../activities';
import { WorkflowService } from '../services';

@Injectable()
class ProcessActivity implements Activity {
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

@Workflow({
    name: 'while_processing_workflow',
    activities: [
        StartActivity,
        WhileActivity,
        ProcessActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'while' },
        { from: 'while', to: 'process' },
        { from: 'process', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class WhileProcessingWorkflow {
    @While({
        defaultMaxIterations: 10,
        defaultContinueOnError: false
    })
    while!: WhileActivity;
}

@Injectable()
export class DataProcessor {
    constructor(private workflowService: WorkflowService) {}

    async processWithCondition() {
        let counter = 0;
        
        const context = {
            condition: async (ctx: ActivityContext) => {
                counter++;
                return counter < 5; // 循环5次
            },
            body: new ProcessActivity(),
            onIteration: (iteration: number, result: ActivityResult) => {
                console.log(`Iteration ${iteration} completed:`, result);
            },
            onComplete: () => {
                console.log('While processing completed');
            }
        };

        const result = await this.workflowService.startWorkflow(
            WhileProcessingWorkflow,
            context
        );

        return result;
    }
} 