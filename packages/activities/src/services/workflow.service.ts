import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { WorkflowDefinition } from '../Workflow';

export interface WorkflowExecutionContext extends ActivityContext {
    workflowId?: string;
    startTime?: number;
    endTime?: number;
    currentState?: string;
    states: Map<string, ActivityResult>;
}

@Injectable()
export class WorkflowService {
    private activeWorkflows: Map<string, WorkflowExecutionContext> = new Map();

    async startWorkflow<T extends ActivityContext>(
        workflowDefinition: new () => any,
        context: T
    ): Promise<ActivityResult> {
        const workflow = new workflowDefinition();
        const workflowId = this.generateWorkflowId();
        const executionContext: WorkflowExecutionContext = {
            ...context,
            workflowId,
            startTime: Date.now(),
            currentState: workflowDefinition.prototype.initialState,
            states: new Map()
        };

        this.activeWorkflows.set(workflowId, executionContext);

        try {
            const result = await this.executeWorkflow(workflow, executionContext);
            executionContext.endTime = Date.now();
            return result;
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: {
                    workflowId,
                    executionContext
                }
            };
        } finally {
            this.activeWorkflows.delete(workflowId);
        }
    }

    private async executeWorkflow(
        workflow: any,
        context: WorkflowExecutionContext
    ): Promise<ActivityResult> {
        const definition = this.getWorkflowDefinition(workflow);
        let currentState = context.currentState;

        while (currentState) {
            const activity = this.getActivity(workflow, currentState);
            if (!activity) {
                throw new Error(`No activity found for state: ${currentState}`);
            }

            const result = await activity.execute(context);
            context.states.set(currentState, result);

            if (!result.success) {
                return result;
            }

            const nextState = this.getNextState(definition, currentState, context);
            if (!nextState) {
                return {
                    success: true,
                    data: {
                        workflowId: context.workflowId,
                        states: context.states,
                        completed: true
                    }
                };
            }

            currentState = nextState;
        }

        return {
            success: true,
            data: {
                workflowId: context.workflowId,
                states: context.states,
                completed: true
            }
        };
    }

    private getWorkflowDefinition(workflow: any): WorkflowDefinition {
        const definition = Reflect.getMetadata('workflow', workflow.constructor);
        if (!definition) {
            throw new Error('Invalid workflow definition');
        }
        return definition;
    }

    private getActivity(workflow: any, state: string): Activity | undefined {
        const definition = this.getWorkflowDefinition(workflow);
        const activityClass = definition.activities.find(a => a.name === state);
        if (!activityClass) {
            return undefined;
        }

        return workflow[state.toLowerCase()];
    }

    private getNextState(
        definition: WorkflowDefinition,
        currentState: string,
        context: WorkflowExecutionContext
    ): string | undefined {
        const transition = definition.transitions.find(t => 
            t.from === currentState && 
            (!t.condition || t.condition(context))
        );
        return transition?.to;
    }

    private generateWorkflowId(): string {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getActiveWorkflow(workflowId: string): WorkflowExecutionContext | undefined {
        return this.activeWorkflows.get(workflowId);
    }

    getAllActiveWorkflows(): WorkflowExecutionContext[] {
        return Array.from(this.activeWorkflows.values());
    }

    async cancelWorkflow(workflowId: string): Promise<void> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (workflow) {
            // 执行补偿操作
            const currentState = workflow.currentState;
            if (currentState) {
                const activity = this.getActivity(workflow, currentState);
                if (activity?.compensate) {
                    await activity.compensate(workflow);
                }
            }
        }
    }
}
