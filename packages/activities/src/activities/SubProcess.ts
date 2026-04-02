import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { VisualWorkflowDefinition } from '../visual/types';

@Directive({ selector: 'subprocess' })
export class SubProcessActivity extends Activity {
    @Attribute()
    workflow!: VisualWorkflowDefinition;

    @Attribute()
    workflowId?: string;

    @Attribute()
    inputs?: Record<string, any>;

    @Attribute()
    waitForComplete: boolean = true;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.workflow && !this.workflowId) {
            return {
                success: false,
                error: new Error('No workflow or workflowId provided')
            };
        }

        const workflowToExecute = this.workflow || { id: this.workflowId, nodes: [], connections: [] };

        return {
            success: true,
            data: {
                workflowId: workflowToExecute.id,
                inputs: this.inputs || context,
                executed: true
            }
        };
    }
}
