import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { TimerActivity } from '../activities/TimerActivity';
import { Activity } from '../activities/Activity';
import { EndActivity, StartActivity } from '../activities/BaseActivities';
import { ActivityResult } from '../activities/Activity';
import { ActivityContext } from '../activities/Activity';
import { Timer } from '../decorators/timer.decorator';
import { WorkflowService } from '../services/workflow.service';

@Injectable()
class DataCheckActivity implements Activity {
    name = 'check_data';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 模拟数据检查
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            data: { checked: true }
        };
    }
}

@Workflow({
    name: 'scheduled_check_workflow',
    activities: [
        StartActivity,
        TimerActivity,
        DataCheckActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'timer' },
        { from: 'timer', to: 'check_data' },
        { from: 'check_data', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ScheduledCheckWorkflow {
    @Timer({
        defaultDelay: 5000,
        defaultImmediate: false
    })
    timer!: TimerActivity;
}

@Injectable()
export class DataMonitor {
    constructor(private workflowService: WorkflowService) {}

    async startMonitoring() {
        const context = {
            type: 'interval',
            interval: 30000, // 30秒
            maxRepeats: 10,  // 最多执行10次
            immediate: true,
            callback: async (ctx: ActivityContext) => {
                console.log('Checking data...');
                // 执行数据检查逻辑
            },
            onComplete: () => {
                console.log('Monitoring completed');
            }
        };

        const result = await this.workflowService.startWorkflow(
            ScheduledCheckWorkflow,
            context
        );

        return result;
    }

    async scheduleCheck(targetDate: Date) {
        const context = {
            type: 'date',
            targetDate,
            callback: async (ctx: ActivityContext) => {
                console.log('Executing scheduled check...');
                // 执行定时检查逻辑
            }
        };

        const result = await this.workflowService.startWorkflow(
            ScheduledCheckWorkflow,
            context
        );

        return result;
    }
} 
