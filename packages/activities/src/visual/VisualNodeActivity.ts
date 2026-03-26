import { Abstract, Injectable, token } from '@tsdi/ioc';
import { Component, Attribute } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import {
    IVisualWorkflowNode,
    NodePosition,
    NodePort,
    NodeConnection,
    VisualNodeType,
    VisualWorkflowDefinition,
    NodeStyle
} from './types';

export const VISUAL_NODE = token<IVisualWorkflowNode>('VISUAL_NODE');

@Abstract()
export abstract class VisualNodeActivity extends Activity implements IVisualWorkflowNode {

    @Attribute()
    id!: string;

    @Attribute()
    name!: string;

    @Attribute()
    type!: VisualNodeType;

    @Attribute()
    position!: NodePosition;

    @Attribute()
    description?: string;

    @Attribute()
    inputs?: NodePort[];

    @Attribute()
    outputs?: NodePort[];

    @Attribute()
    config?: Record<string, any>;

    @Attribute()
    style?: NodeStyle;

    getNodeId(): string {
        return this.id;
    }

    getNodeName(): string {
        return this.name;
    }

    getNodeType(): VisualNodeType {
        return this.type;
    }

    getPosition(): NodePosition {
        return this.position;
    }

    setPosition(position: NodePosition): void {
        this.position = position;
    }

    getInputs(): NodePort[] {
        return this.inputs || [];
    }

    getOutputs(): NodePort[] {
        return this.outputs || [];
    }

    getConfig(): Record<string, any> | undefined {
        return this.config;
    }

    setConfig(config: Record<string, any>): void {
        this.config = { ...this.config, ...config };
    }

    toVisualNode(): IVisualWorkflowNode {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            position: this.position,
            description: this.description,
            inputs: this.inputs,
            outputs: this.outputs,
            config: this.config,
            style: this.style
        };
    }

    static fromVisualNode(node: IVisualWorkflowNode): VisualNodeActivity {
        const activity = new (this as any)();
        activity.id = node.id;
        activity.name = node.name;
        activity.type = node.type;
        activity.position = node.position;
        activity.description = node.description;
        activity.inputs = node.inputs;
        activity.outputs = node.outputs;
        activity.config = node.config;
        activity.style = node.style;
        return activity;
    }
}

@Component({ selector: 'start-node' })
export class StartNodeActivity extends VisualNodeActivity {

    constructor() {
        super();
        this.type = 'start';
        this.name = 'Start';
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Next'
        }];
        this.style = {
            backgroundColor: '#4CAF50',
            textColor: '#ffffff',
            borderRadius: 50
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { started: true, nodeId: this.id }
        };
    }
}

@Component({ selector: 'end-node' })
export class EndNodeActivity extends VisualNodeActivity {

    constructor() {
        super();
        this.type = 'end';
        this.name = 'End';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Previous'
        }];
        this.style = {
            backgroundColor: '#f44336',
            textColor: '#ffffff',
            borderRadius: 50
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { completed: true, nodeId: this.id }
        };
    }
}

@Component({ selector: 'task-node' })
export class TaskNodeActivity extends VisualNodeActivity {

    @Attribute()
    action!: (context: ActivityContext) => Promise<any> | any;

    @Attribute()
    taskName?: string;

    constructor() {
        super();
        this.type = 'task';
        this.name = 'Task';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Output'
        }, {
            id: 'error',
            name: 'error',
            type: 'output',
            label: 'Error'
        }];
        this.style = {
            backgroundColor: '#2196F3',
            textColor: '#ffffff',
            borderRadius: 8
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            const result = await this.action(context);
            return {
                success: true,
                data: { result, nodeId: this.id }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: { nodeId: this.id }
            };
        }
    }
}

@Component({ selector: 'condition-node' })
export class ConditionNodeActivity extends VisualNodeActivity {

    @Attribute()
    condition!: (context: ActivityContext) => boolean | Promise<boolean>;

    constructor() {
        super();
        this.type = 'condition';
        this.name = 'Condition';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'true',
            name: 'true',
            type: 'output',
            label: 'True'
        }, {
            id: 'false',
            name: 'false',
            type: 'output',
            label: 'False'
        }];
        this.style = {
            backgroundColor: '#FF9800',
            textColor: '#ffffff',
            borderRadius: 4
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const result = await this.condition(context);
        return {
            success: true,
            data: { condition: result, nodeId: this.id }
        };
    }
}

@Component({ selector: 'parallel-node' })
export class ParallelNodeActivity extends VisualNodeActivity {

    @Attribute()
    branches: Activity[] = [];

    @Attribute()
    maxConcurrent = 5;

    @Attribute()
    waitAll = true;

    constructor() {
        super();
        this.type = 'parallel';
        this.name = 'Parallel';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Complete'
        }];
        this.style = {
            backgroundColor: '#9C27B0',
            textColor: '#ffffff',
            borderRadius: 8
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const results: ActivityResult[] = [];
        const errors: Error[] = [];

        const queue = [...this.branches];
        const running: Promise<void>[] = [];

        while (queue.length > 0 || running.length > 0) {
            while (queue.length > 0 && running.length < this.maxConcurrent) {
                const activity = queue.shift()!;
                const promise = activity.execute(context).then(result => {
                    results.push(result);
                    if (!result.success && result.error) {
                        errors.push(result.error);
                    }
                });
                running.push(promise);
            }

            if (running.length > 0) {
                await Promise.race(running);
                running.splice(0, running.findIndex(p => !queue.includes(p as any)));
            }
        }

        return {
            success: errors.length === 0,
            data: { results, errors: errors.length > 0 ? errors : undefined, nodeId: this.id },
            error: errors.length > 0 ? errors[0] : undefined
        };
    }
}

@Component({ selector: 'delay-node' })
export class DelayNodeActivity extends VisualNodeActivity {

    @Attribute()
    delay = 1000;

    constructor() {
        super();
        this.type = 'delay';
        this.name = 'Delay';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Output'
        }];
        this.style = {
            backgroundColor: '#607D8B',
            textColor: '#ffffff',
            borderRadius: 8
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        await new Promise(resolve => setTimeout(resolve, this.delay));
        return {
            success: true,
            data: { delayed: this.delay, nodeId: this.id }
        };
    }
}

@Component({ selector: 'loop-node' })
export class LoopNodeActivity extends VisualNodeActivity {

    @Attribute()
    body!: Activity;

    @Attribute()
    condition!: (context: ActivityContext, iteration: number) => boolean | Promise<boolean>;

    @Attribute()
    maxIterations = 1000;

    constructor() {
        super();
        this.type = 'loop';
        this.name = 'Loop';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Output'
        }];
        this.style = {
            backgroundColor: '#795548',
            textColor: '#ffffff',
            borderRadius: 8
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const results: ActivityResult[] = [];
        let iteration = 0;

        while (iteration < this.maxIterations) {
            const shouldContinue = await this.condition(context, iteration);
            if (!shouldContinue) break;

            const result = await this.body.execute(context);
            results.push(result);
            iteration++;
        }

        return {
            success: true,
            data: { iterations: iteration, results, nodeId: this.id }
        };
    }
}

@Component({ selector: 'switch-node' })
export class SwitchNodeActivity extends VisualNodeActivity {

    @Attribute()
    value!: (context: ActivityContext) => any | Promise<any>;

    @Attribute()
    cases: Map<any, Activity> = new Map();

    @Attribute()
    defaultCase?: Activity;

    constructor() {
        super();
        this.type = 'switch';
        this.name = 'Switch';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Output'
        }];
        this.style = {
            backgroundColor: '#00BCD4',
            textColor: '#ffffff',
            borderRadius: 8
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const value = await this.value(context);
        const activity = this.cases.get(value) || this.defaultCase;

        if (!activity) {
            return {
                success: false,
                error: new Error(`No case found for value: ${value}`),
                data: { value, nodeId: this.id }
            };
        }

        const result = await activity.execute(context);
        return {
            success: result.success,
            data: { value, caseResult: result.data, nodeId: this.id },
            error: result.error
        };
    }
}

@Component({ selector: 'trycatch-node' })
export class TryCatchNodeActivity extends VisualNodeActivity {

    @Attribute()
    tryActivity!: Activity;

    @Attribute()
    catchActivity?: Activity;

    @Attribute()
    finallyActivity?: Activity;

    constructor() {
        super();
        this.type = 'trycatch';
        this.name = 'Try-Catch';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Output'
        }, {
            id: 'error',
            name: 'error',
            type: 'output',
            label: 'Error'
        }];
        this.style = {
            backgroundColor: '#E91E63',
            textColor: '#ffffff',
            borderRadius: 8
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        let result: ActivityResult;
        let caughtError: Error | undefined;

        try {
            result = await this.tryActivity.execute(context);
        } catch (error) {
            caughtError = error as Error;
            if (this.catchActivity) {
                result = await this.catchActivity.execute(context);
            } else {
                result = {
                    success: false,
                    error: caughtError,
                    data: { nodeId: this.id }
                };
            }
        } finally {
            if (this.finallyActivity) {
                await this.finallyActivity.execute(context);
            }
        }

        return {
            ...result,
            data: { ...result.data, caughtError, nodeId: this.id }
        };
    }
}

@Component({ selector: 'subprocess-node' })
export class SubProcessNodeActivity extends VisualNodeActivity {

    @Attribute()
    workflow!: VisualWorkflowDefinition;

    constructor() {
        super();
        this.type = 'subprocess';
        this.name = 'Sub-Process';
        this.inputs = [{
            id: 'in',
            name: 'in',
            type: 'input',
            label: 'Input'
        }];
        this.outputs = [{
            id: 'out',
            name: 'out',
            type: 'output',
            label: 'Output'
        }];
        this.style = {
            backgroundColor: '#3F51B5',
            textColor: '#ffffff',
            borderRadius: 8
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { subprocess: this.workflow.name, nodeId: this.id }
        };
    }
}