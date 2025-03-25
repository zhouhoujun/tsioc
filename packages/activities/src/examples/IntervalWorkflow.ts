import { Injectable } from '@tsdi/ioc';
import { Workflow, Interval } from '../decorators';
import { WorkflowService } from '../services/workflow.service';
import { Activity, ActivityContext, ActivityResult, EndActivity, IntervalActivity, StartActivity } from '../activities';

@Injectable()
class MonitorActivity implements Activity {
    name = 'monitor';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 执行监控逻辑
        const status = await checkSystemStatus();
        
        return {
            success: true,
            data: { 
                timestamp: Date.now(),
                status 
            }
        };
    }
}

@Workflow({
    name: 'monitoring_workflow',
    activities: [
        StartActivity,
        IntervalActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'interval' },
        { from: 'interval', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class MonitoringWorkflow {
    @Interval({
        defaultInterval: 5000,  // 5秒
        defaultImmediate: true
    })
    interval!: IntervalActivity;
}

@Injectable()
export class MonitoringService {
    constructor(private workflowService: WorkflowService) {}

    async startMonitoring() {
        const context = {
            interval: 10000, // 10秒间隔
            action: new MonitorActivity(),
            maxExecutions: 100, // 最多执行100次
            immediate: true,
            onExecution: (execution: number, result: ActivityResult) => {
                console.log(`Monitor execution ${execution}:`, result.data);
            },
            onComplete: () => {
                console.log('Monitoring completed');
            }
        };

        const result = await this.workflowService.startWorkflow(
            MonitoringWorkflow,
            context
        );

        return result;
    }
} 

function checkSystemStatus() {
    throw new Error('Function not implemented.');
}
