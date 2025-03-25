import { Injectable } from '@tsdi/ioc';
import { Workflow, Invoke } from '../decorators';
import { WorkflowService } from '../services/workflow.service';
import { EndActivity, StartActivity, InvokeActivity, ActivityContext } from '../activities';

// 示例：远程服务调用
async function callExternalService(context: ActivityContext): Promise<any> {
    const { url, method, data } = context;
    // 模拟 HTTP 请求
    return await fetch(url, {
        method,
        body: JSON.stringify(data)
    }).then(res => res.json());
}

@Workflow({
    name: 'service_call_workflow',
    activities: [
        StartActivity,
        InvokeActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'invoke' },
        { from: 'invoke', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ServiceCallWorkflow {
    @Invoke({
        defaultRetry: {
            maxAttempts: 3,
            delay: 1000,
            backoff: 2
        }
    })
    invoke!: InvokeActivity;
}

@Injectable()
export class ServiceCaller {
    constructor(private workflowService: WorkflowService) {}

    async callService(url: string, method: string, data: any) {
        const context = {
            target: callExternalService,
            args: [],
            url,
            method,
            data,
            resultMapper: (result: any) => {
                // 转换结果
                return {
                    ...result,
                    timestamp: Date.now()
                };
            },
            errorHandler: async (error: Error) => {
                console.error('Service call failed:', error);
                // 可以返回自定义的失败结果
                return {
                    success: false,
                    error,
                    data: { handled: true }
                };
            },
            retry: {
                maxAttempts: 5,
                delay: 2000,
                backoff: 1.5
            }
        };

        const result = await this.workflowService.startWorkflow(
            ServiceCallWorkflow,
            context
        );

        return result;
    }
} 