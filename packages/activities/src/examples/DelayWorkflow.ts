import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { DelayActivity } from '../activities/Delay';
import { WorkflowService } from '../services/workflow.service';
import { StartActivity } from '../activities/BaseActivities';
import { EndActivity } from '../activities/BaseActivities';
import { Delay } from '../decorators/delay.decorator';
import { ProcessActivity } from '../activities/Process';

@Workflow({
    name: 'process_with_delay',
    activities: [
        StartActivity,
        DelayActivity,
        ProcessActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'delay' },
        { from: 'delay', to: 'process' },
        { from: 'process', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ProcessWithDelayWorkflow {
    @Delay({
        defaultDuration: 2000,
        showProgress: true,
        progressInterval: 100
    })
    delay!: DelayActivity;
}

@Injectable()
export class ProcessService {
    constructor(private workflowService: WorkflowService) {}

    async processWithDelay() {
        const context = {
            duration: 3000, // 3秒延迟
            interruptible: true,
            onProgress: (progress: number) => {
                console.log(`Progress: ${progress.toFixed(1)}%`);
            }
        };

        const result = await this.workflowService.startWorkflow(
            ProcessWithDelayWorkflow,
            context
        );

        return result;
    }
} 