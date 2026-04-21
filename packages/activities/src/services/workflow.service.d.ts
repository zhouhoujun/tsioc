import { Type } from '@tsdi/ioc';
import { ActivityContext, ActivityResult } from '../activities/Activity';
export interface ActivityRef<T = any> {
    instance: T;
    result?: ActivityResult;
}
export interface WorkflowExecutionContext extends ActivityContext {
    workflowId?: string;
    startTime?: number;
    endTime?: number;
    currentState?: string;
    states: Map<string, ActivityResult>;
}
export declare class WorkflowService {
    private activeWorkflows;
    run<T>(activityType: Type<T>): Promise<ActivityRef<T>>;
    startWorkflow<T extends ActivityContext>(workflowDefinition: new () => any, context: T): Promise<ActivityResult>;
    private executeWorkflow;
    private getWorkflowDefinition;
    private getActivity;
    private getNextState;
    private generateWorkflowId;
    getActiveWorkflow(workflowId: string): WorkflowExecutionContext | undefined;
    getAllActiveWorkflows(): WorkflowExecutionContext[];
    cancelWorkflow(workflowId: string): Promise<void>;
}
