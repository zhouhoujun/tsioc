import { Workflow } from '../decorators/workflow.decorator';
import { While } from '../decorators/while.decorator';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

class ProcessActivity implements Activity {
    name = 'process';

    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 实现数据处理逻辑
        console.log('Processing data...');
        return { success: true, data: context.data };
    }
}

@Workflow()
export class DataProcessingWorkflow {
    @While({
        defaultMaxIterations: 10,
        defaultInterval: 1000,
        defaultContinueOnError: true
    })
    async processDataUntilComplete(
        activity: Activity,
        options?: {
            maxIterations?: number;
            interval?: number;
            onIteration?: (iteration: number, result: any) => void;
            errorHandler?: (error: Error, iteration: number) => Promise<any>;
            continueOnError?: boolean;
            throwOnConditionFalse?: boolean;
        }
    ) {
        // 这里实现循环条件
        // 例如：检查数据是否处理完成
        return true; // 示例中始终返回 true，实际应用中应该根据具体条件返回
    }
}

// 示例使用
export class DataProcessingService {
    constructor(private workflow: DataProcessingWorkflow) {}

    async processDataWithRetry(data: any) {
        const processActivity = new ProcessActivity();

        return await this.workflow.processDataUntilComplete(processActivity, {
            maxIterations: 5,
            interval: 2000,
            onIteration: (iteration, result) => {
                console.log(`Iteration ${iteration} completed with result:`, result);
            },
            errorHandler: async (error, iteration) => {
                console.error(`Error at iteration ${iteration}:`, error);
                return { success: false, error };
            }
        });
    }
} 