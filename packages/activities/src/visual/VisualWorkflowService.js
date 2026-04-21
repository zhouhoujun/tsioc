"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualWorkflowService = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-case-declarations */
const ioc_1 = require("@tsdi/ioc");
let VisualWorkflowService = class VisualWorkflowService {
    constructor(injector) {
        this.injector = injector;
        this.executions = new Map();
    }
    async execute(definition, context = {}) {
        const executionId = this.generateExecutionId();
        const state = {
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
            const result = await this.executeFromNode(startNode, definition, nodeMap, context, state);
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
        }
        catch (error) {
            state.status = 'failed';
            state.endTime = Date.now();
            state.error = error;
            return {
                success: false,
                error: error,
                data: { executionId, workflowId: definition.id }
            };
        }
        finally {
            this.executions.delete(executionId);
        }
    }
    buildNodeMap(definition) {
        const map = new Map();
        for (const node of definition.nodes) {
            map.set(node.id, node);
        }
        return map;
    }
    findStartNode(definition, nodeMap) {
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
    async executeFromNode(node, definition, nodeMap, context, state) {
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
                const nextResult = await this.executeFromNode(nextNode, definition, nodeMap, { ...context, ...nextNodeInfo.context }, state);
                if (!nextResult.success && nextNodeInfo.required) {
                    return nextResult;
                }
            }
        }
        return result;
    }
    getNextNodes(nodeId, definition, context, result) {
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
    createActivityFromNode(node) {
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
            execute: async (context) => {
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
            compensate: async (context) => { }
        };
        return activity;
    }
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    async cancelExecution(executionId) {
        const state = this.executions.get(executionId);
        if (state) {
            state.status = 'cancelled';
            state.endTime = Date.now();
        }
    }
    serialize(definition) {
        return JSON.stringify(definition, null, 2);
    }
    deserialize(json) {
        return JSON.parse(json);
    }
    validate(definition) {
        const errors = [];
        if (!definition.id) {
            errors.push('Workflow ID is required');
        }
        if (!definition.name) {
            errors.push('Workflow name is required');
        }
        if (!definition.nodes || definition.nodes.length === 0) {
            errors.push('Workflow must have at least one node');
        }
        else {
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
            }
            else if (startNodes.length > 1) {
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
    detectCycles(definition) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
        const dfs = (nodeId) => {
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
                }
                else if (recursionStack.has(targetId)) {
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
};
exports.VisualWorkflowService = VisualWorkflowService;
exports.VisualWorkflowService = VisualWorkflowService = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Injector])
], VisualWorkflowService);
//# sourceMappingURL=VisualWorkflowService.js.map