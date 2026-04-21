"use strict";
var VisualWorkflowBuilder_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualWorkflowBuilder = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
let VisualWorkflowBuilder = VisualWorkflowBuilder_1 = class VisualWorkflowBuilder {
    constructor() {
        this.id = '';
        this.name = '';
        this.description = '';
        this.version = '1.0.0';
        this.nodes = [];
        this.connections = [];
    }
    setId(id) {
        this.id = id;
        return this;
    }
    setName(name) {
        this.name = name;
        return this;
    }
    setDescription(description) {
        this.description = description;
        return this;
    }
    setVersion(version) {
        this.version = version;
        return this;
    }
    addNode(node) {
        const fullNode = {
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: [],
            ...node
        };
        this.nodes.push(fullNode);
        return this;
    }
    startNode(name = 'Start', position) {
        return this.addNode({
            id: `start_${this.nodes.length}`,
            name,
            type: 'start',
            position: position || { x: 100, y: 100 },
            outputs: [{ id: 'out', name: 'out', type: 'output', label: 'Next' }],
            style: {
                backgroundColor: '#4CAF50',
                textColor: '#ffffff',
                borderRadius: 50
            }
        });
    }
    endNode(name = 'End', position) {
        return this.addNode({
            id: `end_${this.nodes.length}`,
            name,
            type: 'end',
            position: position || { x: 500, y: 100 },
            inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Previous' }],
            style: {
                backgroundColor: '#f44336',
                textColor: '#ffffff',
                borderRadius: 50
            }
        });
    }
    taskNode(name, config, position) {
        return this.addNode({
            id: `task_${this.nodes.length}`,
            name,
            type: 'task',
            position: position || { x: 300, y: 100 },
            config,
            inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Input' }],
            outputs: [
                { id: 'out', name: 'out', type: 'output', label: 'Output' },
                { id: 'error', name: 'error', type: 'output', label: 'Error' }
            ],
            style: {
                backgroundColor: '#2196F3',
                textColor: '#ffffff',
                borderRadius: 8
            }
        });
    }
    conditionNode(name, config, position) {
        return this.addNode({
            id: `condition_${this.nodes.length}`,
            name,
            type: 'condition',
            position: position || { x: 300, y: 100 },
            config,
            inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Input' }],
            outputs: [
                { id: 'true', name: 'true', type: 'output', label: 'True' },
                { id: 'false', name: 'false', type: 'output', label: 'False' }
            ],
            style: {
                backgroundColor: '#FF9800',
                textColor: '#ffffff',
                borderRadius: 4
            }
        });
    }
    parallelNode(name, config, position) {
        return this.addNode({
            id: `parallel_${this.nodes.length}`,
            name,
            type: 'parallel',
            position: position || { x: 300, y: 100 },
            config,
            inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Input' }],
            outputs: [{ id: 'out', name: 'out', type: 'output', label: 'Complete' }],
            style: {
                backgroundColor: '#9C27B0',
                textColor: '#ffffff',
                borderRadius: 8
            }
        });
    }
    delayNode(name, delay = 1000, position) {
        return this.addNode({
            id: `delay_${this.nodes.length}`,
            name,
            type: 'delay',
            position: position || { x: 300, y: 100 },
            config: { delay },
            inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Input' }],
            outputs: [{ id: 'out', name: 'out', type: 'output', label: 'Output' }],
            style: {
                backgroundColor: '#607D8B',
                textColor: '#ffffff',
                borderRadius: 8
            }
        });
    }
    customNode(node) {
        return this.addNode(node);
    }
    connect(sourceNodeId, targetNodeId, options) {
        const connection = {
            id: `conn_${this.connections.length}`,
            sourceNodeId,
            sourcePort: options?.sourcePort || 'out',
            targetNodeId,
            targetPort: options?.targetPort || 'in',
            label: options?.label,
            condition: options?.condition
        };
        this.connections.push(connection);
        return this;
    }
    connectNodes(sourceNodeId, targetNodeId, sourcePort = 'out', targetPort = 'in') {
        return this.connect(sourceNodeId, targetNodeId, { sourcePort, targetPort });
    }
    build() {
        if (!this.id) {
            this.id = `workflow_${Date.now()}`;
        }
        if (!this.name) {
            this.name = 'Unnamed Workflow';
        }
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            version: this.version,
            nodes: this.nodes,
            connections: this.connections,
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
    }
    static create() {
        return new VisualWorkflowBuilder_1();
    }
    reset() {
        this.id = '';
        this.name = '';
        this.description = '';
        this.version = '1.0.0';
        this.nodes = [];
        this.connections = [];
        return this;
    }
};
exports.VisualWorkflowBuilder = VisualWorkflowBuilder;
exports.VisualWorkflowBuilder = VisualWorkflowBuilder = VisualWorkflowBuilder_1 = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], VisualWorkflowBuilder);
//# sourceMappingURL=VisualWorkflowBuilder.js.map