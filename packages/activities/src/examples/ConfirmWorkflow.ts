import { Injectable } from '@tsdi/ioc';
import { Workflow } from '../decorators/workflow.decorator';
import { ConfirmActivity } from '../activities/Confirm';
import { WorkflowService } from '../services/workflow.service';
import { Activity, ActivityResult } from '../activities/Activity';
import { ActivityContext } from '../activities/Activity';
import { StartActivity, EndActivity } from '../activities/BaseActivities';
import { Confirm } from '../decorators/confirm.decorator';

@Injectable()
export class DeleteItemActivity implements Activity {
    name = 'delete_item';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        // 实现删除逻辑
        return {
            success: true,
            data: { deletedId: context.itemId }
        };
    }

    async compensate(context: ActivityContext): Promise<void> {
        // 实现恢复删除项的逻辑
        console.log('Restoring deleted item...');
    }
}

@Workflow({
    name: 'delete_with_confirm',
    activities: [
        StartActivity,
        ConfirmActivity,
        DeleteItemActivity,
        EndActivity
    ],
    transitions: [
        { from: 'start', to: 'confirm' },
        { 
            from: 'confirm', 
            to: 'delete_item',
            condition: (ctx: ActivityContext) => ctx.confirmed === true 
        },
        { 
            from: 'confirm', 
            to: 'end',
            condition: (ctx: ActivityContext) => ctx.confirmed === false 
        },
        { from: 'delete_item', to: 'end' }
    ],
    initialState: 'start',
    finalStates: ['end']
})
export class DeleteWithConfirmWorkflow {
    @Confirm({
        message: 'Are you sure you want to delete this item?',
        title: 'Delete Confirmation',
        confirmText: 'Yes, delete',
        cancelText: 'Cancel'
    })
    confirm!: ConfirmActivity;
}

@Injectable()
export class ItemService {
    constructor(private workflowService: WorkflowService) {}

    async deleteItem(itemId: string) {
        const context = {
            itemId,
            confirmCallback: async () => {
                // 可以实现自定义的确认UI逻辑
                return new Promise<boolean>((resolve) => {
                    // 示例：使用自定义对话框
                    const confirmed = window.confirm('确认删除？');
                    resolve(confirmed);
                });
            },
            cancelCallback: async () => {
                // 取消时的清理逻辑
                console.log('Delete operation cancelled');
            }
        };

        const result = await this.workflowService.startWorkflow(
            DeleteWithConfirmWorkflow,
            context
        );

        return result;
    }
} 