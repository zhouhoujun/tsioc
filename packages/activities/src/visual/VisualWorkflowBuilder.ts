import { Injectable } from '@tsdi/ioc';
import {
    VisualWorkflowDefinition,
    IVisualWorkflowNode,
    NodeConnection,
    VisualNodeType,
    NodePosition,
    NodeStyle
} from './types';

@Injectable()
export class VisualWorkflowBuilder {
    private id: string = '';
    private name: string = '';
    private description: string = '';
    private version: string = '1.0.0';
    private nodes: IVisualWorkflowNode[] = [];
    private connections: NodeConnection[] = [];

    setId(id: string): this {
        this.id = id;
        return this;
    }

    setName(name: string): this {
        this.name = name;
        return this;
    }

    setDescription(description: string): this {
        this.description = description;
        return this;
    }

    setVersion(version: string): this {
        this.version = version;
        return this;
    }

    addNode(node: Partial<IVisualWorkflowNode> & { id: string; name: string; type: VisualNodeType }): this {
        const fullNode: IVisualWorkflowNode = {
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: [],
            ...node
        };
        this.nodes.push(fullNode);
        return this;
    }

    startNode(name: string = 'Start', position?: NodePosition): this {
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

    endNode(name: string = 'End', position?: NodePosition): this {
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

    taskNode(
        name: string,
        config?: Record<string, any>,
        position?: NodePosition
    ): this {
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

    conditionNode(
        name: string,
        config?: Record<string, any>,
        position?: NodePosition
    ): this {
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

    parallelNode(
        name: string,
        config?: Record<string, any>,
        position?: NodePosition
    ): this {
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

    delayNode(
        name: string,
        delay: number = 1000,
        position?: NodePosition
    ): this {
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

    customNode(
        node: Partial<IVisualWorkflowNode> & { id: string; name: string; type: VisualNodeType }
    ): this {
        return this.addNode(node);
    }

    connect(
        sourceNodeId: string,
        targetNodeId: string,
        options?: {
            sourcePort?: string;
            targetPort?: string;
            label?: string;
            condition?: (context: any) => boolean;
        }
    ): this {
        const connection: NodeConnection = {
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

    connectNodes(
        sourceNodeId: string,
        targetNodeId: string,
        sourcePort: string = 'out',
        targetPort: string = 'in'
    ): this {
        return this.connect(sourceNodeId, targetNodeId, { sourcePort, targetPort });
    }

    build(): VisualWorkflowDefinition {
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

    static create(): VisualWorkflowBuilder {
        return new VisualWorkflowBuilder();
    }

    reset(): this {
        this.id = '';
        this.name = '';
        this.description = '';
        this.version = '1.0.0';
        this.nodes = [];
        this.connections = [];
        return this;
    }
}