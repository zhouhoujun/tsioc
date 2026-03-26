/* eslint-disable no-case-declarations */
import { Injectable, Injector } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import {
    VisualWorkflowDefinition,
    IVisualWorkflowNode,
    WorkflowExecutionState
} from './types';

@Injectable()
export class VisualWorkflowService {
    private executions: Map<string, WorkflowExecutionState> = new Map();

    constructor(private injector: Injector) {}

    async execute(
        definition: VisualWorkflowDefinition,
        context: ActivityContext = {}
    ): Promise<ActivityResult> {
        const executionId = this.generateExecutionId();
        const state: WorkflowExecutionState = {
            executionId,
            workflowId: definition.id,
            status: 'running',
            startTime: Date.now(),
            nodeResults: new Map()
        };

        this.executions.set(executionId, state);

        try {
            const nodeMap = this.buildNodeMap(definition);
            const startNode = this.findStartNode(definition, nodeMap);
            
            if (!startNode) {
                throw new Error('No start node found in workflow');
            }

            const result = await this.executeFromNode(
                startNode,
                definition,
                nodeMap,
                context,
                state
            );

            state.status = 'completed';
            state.endTime = Date.now();
            state.currentNodeId = undefined;

            return {
                success: true,
                data: {
                    executionId,
                    workflowId: definition.id,
                    nodeResults: Object.fromEntries(state.nodeResults),
                    ...result.data
                }
            };
        } catch (error) {
            state.status = 'failed';
            state.endTime = Date.now();
            state.error = error as Error;

            return {
                success: false,
                error: error as Error,
                data: { executionId, workflowId: definition.id }
            };
        } finally {
            this.executions.delete(executionId);
        }
    }

    private buildNodeMap(definition: VisualWorkflowDefinition): Map<string, IVisualWorkflowNode> {
        const map = new Map<string, IVisualWorkflowNode>();
        for (const node of definition.nodes) {
            map.set(node.id, node);
        }
        return map;
    }

    private findStartNode(
        definition: VisualWorkflowDefinition,
        nodeMap: Map<string, IVisualWorkflowNode>
    ): IVisualWorkflowNode | null {
        for (const node of definition.nodes) {
            if (node.type === 'start') {
                return node;
            }
        }
        
        for (const node of definition.nodes) {
            const hasIncoming = definition.connections.some(c => c.targetNodeId === node.id);
            if (!hasIncoming) {
                return node;
            }
        }
        
        return definition.nodes[0] || null;
    }

    private async executeFromNode(
        node: IVisualWorkflowNode,
        definition: VisualWorkflowDefinition,
        nodeMap: Map<string, IVisualWorkflowNode>,
        context: ActivityContext,
        state: WorkflowExecutionState
    ): Promise<ActivityResult> {
        state.currentNodeId = node.id;

        const activity = this.createActivityFromNode(node);
        const result = await activity.execute(context);
        
        state.nodeResults.set(node.id, result);

        if (!result.success) {
            return result;
        }

        if (node.type === 'end') {
            return result;
        }

        const nextNodes = this.getNextNodes(node.id, definition, context, result);
        
        for (const nextNodeInfo of nextNodes) {
            const nextNode = nodeMap.get(nextNodeInfo.nodeId);
            if (nextNode) {
                const nextResult = await this.executeFromNode(
                    nextNode,
                    definition,
                    nodeMap,
                    { ...context, ...nextNodeInfo.context },
                    state
                );
                
                if (!nextResult.success && nextNodeInfo.required) {
                    return nextResult;
                }
            }
        }

        return result;
    }

    private getNextNodes(
        nodeId: string,
        definition: VisualWorkflowDefinition,
        context: ActivityContext,
        result: ActivityResult
    ): { nodeId: string; context?: any; required: boolean }[] {
        const connections = definition.connections.filter(c => c.sourceNodeId === nodeId);
        
        return connections
            .filter(conn => {
                if (conn.condition) {
                    if (typeof conn.condition === 'function') {
                        return conn.condition(context);
                    }
                    return Boolean(conn.condition);
                }
                if (result.data?.condition !== undefined && conn.sourcePort) {
                    const portValue = String(result.data.condition);
                    return conn.sourcePort === portValue || 
                           conn.sourcePort === String(Boolean(result.data.condition));
                }
                return true;
            })
            .map(conn => ({
                nodeId: conn.targetNodeId,
                context: result.data,
                required: true
            }));
    }

    private createActivityFromNode(node: IVisualWorkflowNode): Activity {
        const activity = {
            id: node.id,
            name: node.name,
            type: node.type,
            position: node.position,
            description: node.description,
            inputs: node.inputs,
            outputs: node.outputs,
            config: node.config,
            style: node.style,
            execute: async (context: ActivityContext): Promise<ActivityResult> => {
                switch (node.type) {
                    case 'delay':
                        const delay = node.config?.delay || 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return {
                            success: true,
                            data: { nodeId: node.id, delayed: delay }
                        };
                    case 'start':
                        return {
                            success: true,
                            data: { nodeId: node.id, started: true }
                        };
                    case 'end':
                        return {
                            success: true,
                            data: { nodeId: node.id, completed: true }
                        };
                    case 'condition':
                        const conditionResult = node.config?.condition ?? true;
                        return {
                            success: true,
                            data: { nodeId: node.id, condition: conditionResult }
                        };
                    default:
                        return {
                            success: true,
                            data: { nodeId: node.id, type: node.type, config: node.config }
                        };
                }
            },
            compensate: async (context: ActivityContext): Promise<void> => {}
        } as Activity;
        
        return activity;
    }

    private generateExecutionId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getExecution(executionId: string): WorkflowExecutionState | undefined {
        return this.executions.get(executionId);
    }

    async cancelExecution(executionId: string): Promise<void> {
        const state = this.executions.get(executionId);
        if (state) {
            state.status = 'cancelled';
            state.endTime = Date.now();
        }
    }

    serialize(definition: VisualWorkflowDefinition): string {
        return JSON.stringify(definition, null, 2);
    }

    deserialize(json: string): VisualWorkflowDefinition {
        return JSON.parse(json) as VisualWorkflowDefinition;
    }

    validate(definition: VisualWorkflowDefinition): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!definition.id) {
            errors.push('Workflow ID is required');
        }

        if (!definition.name) {
            errors.push('Workflow name is required');
        }

        if (!definition.nodes || definition.nodes.length === 0) {
            errors.push('Workflow must have at least one node');
        } else {
            const nodeIds = new Set(definition.nodes.map(n => n.id));
            const duplicateIds = definition.nodes
                .map(n => n.id)
                .filter((id, index, arr) => arr.indexOf(id) !== index);
            
            if (duplicateIds.length > 0) {
                errors.push(`Duplicate node IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
            }

            const startNodes = definition.nodes.filter(n => n.type === 'start');
            if (startNodes.length === 0) {
                errors.push('Workflow must have at least one start node');
            } else if (startNodes.length > 1) {
                errors.push('Workflow should have only one start node');
            }

            for (const conn of definition.connections || []) {
                if (!nodeIds.has(conn.sourceNodeId)) {
                    errors.push(`Connection references non-existent source node: ${conn.sourceNodeId}`);
                }
                if (!nodeIds.has(conn.targetNodeId)) {
                    errors.push(`Connection references non-existent target node: ${conn.targetNodeId}`);
                }
            }

            const cycles = this.detectCycles(definition);
            if (cycles.length > 0) {
                errors.push(`Cycles detected: ${cycles.map(c => c.join(' -> ')).join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private detectCycles(definition: VisualWorkflowDefinition): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const path: string[] = [];

        const dfs = (nodeId: string): boolean => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);

            const outgoingConnections = definition.connections.filter(c => c.sourceNodeId === nodeId);
            
            for (const conn of outgoingConnections) {
                const targetId = conn.targetNodeId;
                
                if (!visited.has(targetId)) {
                    if (dfs(targetId)) {
                        return true;
                    }
                } else if (recursionStack.has(targetId)) {
                    const cycleStart = path.indexOf(targetId);
                    cycles.push([...path.slice(cycleStart), targetId]);
                    return true;
                }
            }

            recursionStack.delete(nodeId);
            path.pop();
            return false;
        };

        for (const node of definition.nodes) {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        }

        return cycles;
    }
}