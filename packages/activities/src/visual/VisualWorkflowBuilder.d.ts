import { VisualWorkflowDefinition, IVisualWorkflowNode, VisualNodeType, NodePosition } from './types';
export declare class VisualWorkflowBuilder {
    private id;
    private name;
    private description;
    private version;
    private nodes;
    private connections;
    setId(id: string): this;
    setName(name: string): this;
    setDescription(description: string): this;
    setVersion(version: string): this;
    addNode(node: Partial<IVisualWorkflowNode> & {
        id: string;
        name: string;
        type: VisualNodeType;
    }): this;
    startNode(name?: string, position?: NodePosition): this;
    endNode(name?: string, position?: NodePosition): this;
    taskNode(name: string, config?: Record<string, any>, position?: NodePosition): this;
    conditionNode(name: string, config?: Record<string, any>, position?: NodePosition): this;
    parallelNode(name: string, config?: Record<string, any>, position?: NodePosition): this;
    delayNode(name: string, delay?: number, position?: NodePosition): this;
    customNode(node: Partial<IVisualWorkflowNode> & {
        id: string;
        name: string;
        type: VisualNodeType;
    }): this;
    connect(sourceNodeId: string, targetNodeId: string, options?: {
        sourcePort?: string;
        targetPort?: string;
        label?: string;
        condition?: (context: any) => boolean;
    }): this;
    connectNodes(sourceNodeId: string, targetNodeId: string, sourcePort?: string, targetPort?: string): this;
    build(): VisualWorkflowDefinition;
    static create(): VisualWorkflowBuilder;
    reset(): this;
}
