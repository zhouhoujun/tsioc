import { Activity, ActivityContext, ActivityResult } from './Activity';
import { VisualWorkflowDefinition } from '../visual/types';
export declare class SubProcessActivity extends Activity {
    workflow: VisualWorkflowDefinition;
    workflowId?: string;
    inputs?: Record<string, any>;
    waitForComplete: boolean;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
