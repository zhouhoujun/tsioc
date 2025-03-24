import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators';
import { Interval } from '../decorators';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

// 活动类
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

// 工作流类
@Workflow({
    name: 'MonitoringWorkflow',
    description: '使用 Interval 装饰器的工作流示例'
})
export class MonitoringWorkflow {
    @Interval({
        defaultInterval: 5000,  // 5秒
        defaultImmediate: true
    })
    async monitorSystem(
        action: Activity,
        options?: {
            interval?: number;
            maxExecutions?: number;
            immediate?: boolean;
            onExecution?: (execution: number, result: ActivityResult) => void;
            onComplete?: () => void;
        }
    ) {
        return { action, ...options };
    }
}

// 服务类
export class MonitoringService {
    constructor(private workflow: MonitoringWorkflow) {}

    async startMonitoring() {
        const monitorActivity = new MonitorActivity();

        return await this.workflow.monitorSystem(
            monitorActivity,
            {
                interval: 10000, // 10秒间隔
                maxExecutions: 100, // 最多执行100次
                immediate: true,
                onExecution: (execution: number, result: ActivityResult) => {
                    console.log(`Monitor execution ${execution}:`, result.data);
                },
                onComplete: () => {
                    console.log('Monitoring completed');
                }
            }
        );
    }
}

// 模拟系统状态检查
async function checkSystemStatus() {
    // 模拟系统状态检查
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100
    };
}
