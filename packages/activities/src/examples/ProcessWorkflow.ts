import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { ProcessActivity } from '../activities/Process';
import { WorkflowService } from '../services/workflow.service';
import { StartActivity } from '../activities/BaseActivities';
import { EndActivity } from '../activities/BaseActivities';
import { Process } from '../decorators/process.decorator';

interface DataItem {
    id: number;
    name: string;
    value: number;
}

@Workflow({
    name: 'data_processing_workflow',
    activities: [
        StartActivity,
        ProcessActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'process' },
        { from: 'process', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class DataProcessingWorkflow {
    @Process({
        batchSize: 50,
        timeout: 5000,
        continueOnError: true,
        showProgress: true,
        progressInterval: 100
    })
    process!: ProcessActivity;
}

@Injectable()
export class DataProcessingService {
    constructor(private workflowService: WorkflowService) {}

    async processData(data: DataItem[]) {
        const context = {
            data,
            processor: async (item: DataItem) => {
                // 模拟数据处理
                await new Promise(resolve => setTimeout(resolve, 100));
                return {
                    ...item,
                    processedValue: item.value * 2,
                    processedAt: new Date().toISOString()
                };
            },
            validator: async (data: DataItem[]) => {
                // 验证数据
                return data.every(item => 
                    typeof item.id === 'number' && 
                    typeof item.name === 'string' && 
                    typeof item.value === 'number'
                );
            },
            onProgress: (progress: number, current: number, total: number) => {
                console.log(`Processing: ${progress}% (${current}/${total})`);
            },
            errorHandler: async (error: Error, data: any) => {
                console.error('Error processing data:', error);
                return {
                    success: false,
                    error,
                    data: {
                        error: error.message,
                        timestamp: new Date().toISOString()
                    }
                };
            }
        };

        const result = await this.workflowService.startWorkflow(
            DataProcessingWorkflow,
            context
        );

        return result;
    }

    async processLargeDataset() {
        // 生成测试数据
        const data: DataItem[] = Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            value: Math.random() * 100
        }));

        return this.processData(data);
    }
} 