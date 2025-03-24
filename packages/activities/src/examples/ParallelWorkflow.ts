import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { ParallelActivity } from '../activities/Parallel';
import { WorkflowService } from '../services/workflow.service';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { StartActivity, EndActivity } from '../activities/BaseActivities';
import { Parallel } from '../decorators/parallel.decorator';

@Injectable()
class DataFetchActivity implements Activity {
    name = 'fetch_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟数据获取
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { source: this.name }
        };
    }
}

@Injectable()
class DataProcessActivity implements Activity {
    name = 'process_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟数据处理
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            success: true,
            data: { processed: true }
        };
    }
}

@Workflow({
    name: 'parallel_processing_workflow',
    activities: [
        StartActivity,
        ParallelActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'parallel' },
        { from: 'parallel', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ParallelProcessingWorkflow {
    @Parallel({
        defaultMaxConcurrent: 3,
        defaultErrorStrategy: 'continue'
    })
    parallel!: ParallelActivity;
}

@Injectable()
export class DataProcessor {
    constructor(private workflowService: WorkflowService) {}

    async processData() {
        const context = {
            activities: [
                new DataFetchActivity(),
                new DataProcessActivity()
            ],
            maxConcurrent: 2,
            waitAll: true,
            onActivityComplete: (activity: Activity, result: ActivityResult) => {
                console.log(`Activity ${activity.name} completed:`, result);
            },
            errorStrategy: 'continue'
        };

        const result = await this.workflowService.startWorkflow(
            ParallelProcessingWorkflow,
            context
        );

        return result;
    }
} 