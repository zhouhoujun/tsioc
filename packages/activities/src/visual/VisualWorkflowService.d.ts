import { Injector } from '@tsdi/ioc';
import { ActivityContext, ActivityResult } from '../activities/Activity';
import { VisualWorkflowDefinition, WorkflowExecutionState } from './types';
export declare class VisualWorkflowService {
    private injector;
    private executions;
    constructor(injector: Injector);
    execute(definition: VisualWorkflowDefinition, context?: ActivityContext): Promise<ActivityResult>;
    private buildNodeMap;
    private findStartNode;
    private executeFromNode;
    private getNextNodes;
    private createActivityFromNode;
    private generateExecutionId;
    getExecution(executionId: string): WorkflowExecutionState | undefined;
    cancelExecution(executionId: string): Promise<void>;
    serialize(definition: VisualWorkflowDefinition): string;
    deserialize(json: string): VisualWorkflowDefinition;
    validate(definition: VisualWorkflowDefinition): {
        valid: boolean;
        errors: string[];
    };
    private detectCycles;
}
