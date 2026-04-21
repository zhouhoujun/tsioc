"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
let WorkflowService = class WorkflowService {
    constructor() {
        this.activeWorkflows = new Map();
    }
    async run(activityType) {
        const instance = new activityType();
        if (typeof instance.onInit === 'function') {
            instance.onInit();
        }
        return {
            instance,
            result: { success: true, data: instance }
        };
    }
    async startWorkflow(workflowDefinition, context) {
        const workflow = new workflowDefinition();
        const workflowId = this.generateWorkflowId();
        const executionContext = {
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
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: {
                    workflowId,
                    executionContext
                }
            };
        }
        finally {
            this.activeWorkflows.delete(workflowId);
        }
    }
    async executeWorkflow(workflow, context) {
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
    getWorkflowDefinition(workflow) {
        const definition = Reflect.getMetadata('workflow', workflow.constructor);
        if (!definition) {
            throw new Error('Invalid workflow definition');
        }
        return definition;
    }
    getActivity(workflow, state) {
        const definition = this.getWorkflowDefinition(workflow);
        const activityClass = definition.activities.find(a => a.name === state);
        if (!activityClass) {
            return undefined;
        }
        return workflow[state.toLowerCase()];
    }
    getNextState(definition, currentState, context) {
        const transition = definition.transitions.find(t => t.from === currentState &&
            (!t.condition || t.condition(context)));
        return transition?.to;
    }
    generateWorkflowId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    getActiveWorkflow(workflowId) {
        return this.activeWorkflows.get(workflowId);
    }
    getAllActiveWorkflows() {
        return Array.from(this.activeWorkflows.values());
    }
    async cancelWorkflow(workflowId) {
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
};
exports.WorkflowService = WorkflowService;
exports.WorkflowService = WorkflowService = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], WorkflowService);
//# sourceMappingURL=workflow.service.js.map