import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import { IVisualWorkflowNode, NodePosition, NodePort, VisualNodeType, VisualWorkflowDefinition, NodeStyle } from './types';
export declare const VISUAL_NODE: import("@tsdi/ioc").InjectToken<IVisualWorkflowNode>;
export declare abstract class VisualNodeActivity extends Activity implements IVisualWorkflowNode {
    id: string;
    name: string;
    type: VisualNodeType;
    position: NodePosition;
    description?: string;
    inputs?: NodePort[];
    outputs?: NodePort[];
    config?: Record<string, any>;
    style?: NodeStyle;
    getNodeId(): string;
    getNodeName(): string;
    getNodeType(): VisualNodeType;
    getPosition(): NodePosition;
    setPosition(position: NodePosition): void;
    getInputs(): NodePort[];
    getOutputs(): NodePort[];
    getConfig(): Record<string, any> | undefined;
    setConfig(config: Record<string, any>): void;
    toVisualNode(): IVisualWorkflowNode;
    static fromVisualNode(node: IVisualWorkflowNode): VisualNodeActivity;
}
export declare class StartNodeActivity extends VisualNodeActivity {
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class EndNodeActivity extends VisualNodeActivity {
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class TaskNodeActivity extends VisualNodeActivity {
    action: (context: ActivityContext) => Promise<any> | any;
    taskName?: string;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class ConditionNodeActivity extends VisualNodeActivity {
    condition: (context: ActivityContext) => boolean | Promise<boolean>;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class ParallelNodeActivity extends VisualNodeActivity {
    branches: Activity[];
    maxConcurrent: number;
    waitAll: boolean;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class DelayNodeActivity extends VisualNodeActivity {
    delay: number;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class LoopNodeActivity extends VisualNodeActivity {
    body: Activity;
    condition: (context: ActivityContext, iteration: number) => boolean | Promise<boolean>;
    maxIterations: number;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class SwitchNodeActivity extends VisualNodeActivity {
    value: (context: ActivityContext) => any | Promise<any>;
    cases: Map<any, Activity>;
    defaultCase?: Activity;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class TryCatchNodeActivity extends VisualNodeActivity {
    tryActivity: Activity;
    catchActivity?: Activity;
    finallyActivity?: Activity;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
export declare class SubProcessNodeActivity extends VisualNodeActivity {
    workflow: VisualWorkflowDefinition;
    constructor();
    execute(context: ActivityContext): Promise<ActivityResult>;
}
