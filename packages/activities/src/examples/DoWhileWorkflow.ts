import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { DoWhileActivity } from '../activities/DoWhile';
import { WorkflowService } from '../services/workflow.service';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { EndActivity, StartActivity } from '../activities/BaseActivities';
import { DoWhile } from '../decorators/do-while.decorator';

@Injectable()
class ProcessItemActivity implements Activity {
    name = 'process_item';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        const { items, currentIndex } = context;
        if (currentIndex >= items.length) {
            return {
                success: false,
                error: new Error('No more items to process')
            };
        }

        // 处理当前项
        const item = items[currentIndex];
        // ... 处理逻辑 ...

        return {
            success: true,
            data: { 
                processedItem: item,
                currentIndex 
            }
        };
    }
}

@Workflow({
    name: 'process_items_workflow',
    activities: [
        StartActivity,
        DoWhileActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'do_while' },
        { from: 'do_while', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class ProcessItemsWorkflow {
    @DoWhile({
        defaultMaxIterations: 1000,
        defaultInterval: 100
    })
    doWhile!: DoWhileActivity;
}

@Injectable()
export class ItemProcessor {
    constructor(private workflowService: WorkflowService) {}

    async processItems(items: any[]) {
        const context = {
            items,
            currentIndex: 0,
            bodyActivity: new ProcessItemActivity(),
            condition: async () => {
                return context.currentIndex < items.length;
            },
            onIteration: (iteration: number, result: ActivityResult) => {
                if (result.success) {
                    context.currentIndex++;
                    console.log(`Processed item ${iteration + 1}/${items.length}`);
                }
            },
            interval: 500 // 每次处理间隔500ms
        };

        const result = await this.workflowService.startWorkflow(
            ProcessItemsWorkflow,
            context
        );

        return result;
    }
} 