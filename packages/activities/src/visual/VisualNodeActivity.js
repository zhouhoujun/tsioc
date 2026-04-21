"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubProcessNodeActivity = exports.TryCatchNodeActivity = exports.SwitchNodeActivity = exports.LoopNodeActivity = exports.DelayNodeActivity = exports.ParallelNodeActivity = exports.ConditionNodeActivity = exports.TaskNodeActivity = exports.EndNodeActivity = exports.StartNodeActivity = exports.VisualNodeActivity = exports.VISUAL_NODE = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const components_1 = require("@tsdi/components");
const Activity_1 = require("../activities/Activity");
exports.VISUAL_NODE = (0, ioc_1.token)('VISUAL_NODE');
let VisualNodeActivity = class VisualNodeActivity extends Activity_1.Activity {
    getNodeId() {
        return this.id;
    }
    getNodeName() {
        return this.name;
    }
    getNodeType() {
        return this.type;
    }
    getPosition() {
        return this.position;
    }
    setPosition(position) {
        this.position = position;
    }
    getInputs() {
        return this.inputs || [];
    }
    getOutputs() {
        return this.outputs || [];
    }
    getConfig() {
        return this.config;
    }
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    toVisualNode() {
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
    static fromVisualNode(node) {
        const activity = new this();
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
};
exports.VisualNodeActivity = VisualNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], VisualNodeActivity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], VisualNodeActivity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], VisualNodeActivity.prototype, "type", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], VisualNodeActivity.prototype, "position", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], VisualNodeActivity.prototype, "description", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], VisualNodeActivity.prototype, "inputs", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], VisualNodeActivity.prototype, "outputs", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], VisualNodeActivity.prototype, "config", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], VisualNodeActivity.prototype, "style", void 0);
exports.VisualNodeActivity = VisualNodeActivity = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], VisualNodeActivity);
let StartNodeActivity = class StartNodeActivity extends VisualNodeActivity {
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
    async execute(context) {
        return {
            success: true,
            data: { started: true, nodeId: this.id }
        };
    }
};
exports.StartNodeActivity = StartNodeActivity;
exports.StartNodeActivity = StartNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'start-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], StartNodeActivity);
let EndNodeActivity = class EndNodeActivity extends VisualNodeActivity {
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
    async execute(context) {
        return {
            success: true,
            data: { completed: true, nodeId: this.id }
        };
    }
};
exports.EndNodeActivity = EndNodeActivity;
exports.EndNodeActivity = EndNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'end-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], EndNodeActivity);
let TaskNodeActivity = class TaskNodeActivity extends VisualNodeActivity {
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
    async execute(context) {
        try {
            const result = await this.action(context);
            return {
                success: true,
                data: { result, nodeId: this.id }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: { nodeId: this.id }
            };
        }
    }
};
exports.TaskNodeActivity = TaskNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], TaskNodeActivity.prototype, "action", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], TaskNodeActivity.prototype, "taskName", void 0);
exports.TaskNodeActivity = TaskNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'task-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], TaskNodeActivity);
let ConditionNodeActivity = class ConditionNodeActivity extends VisualNodeActivity {
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
    async execute(context) {
        const result = await this.condition(context);
        return {
            success: true,
            data: { condition: result, nodeId: this.id }
        };
    }
};
exports.ConditionNodeActivity = ConditionNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], ConditionNodeActivity.prototype, "condition", void 0);
exports.ConditionNodeActivity = ConditionNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'condition-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], ConditionNodeActivity);
let ParallelNodeActivity = class ParallelNodeActivity extends VisualNodeActivity {
    constructor() {
        super();
        this.branches = [];
        this.maxConcurrent = 5;
        this.waitAll = true;
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
    async execute(context) {
        const results = [];
        const errors = [];
        const queue = [...this.branches];
        const running = [];
        while (queue.length > 0 || running.length > 0) {
            while (queue.length > 0 && running.length < this.maxConcurrent) {
                const activity = queue.shift();
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
                running.splice(0, running.findIndex(p => !queue.includes(p)));
            }
        }
        return {
            success: errors.length === 0,
            data: { results, errors: errors.length > 0 ? errors : undefined, nodeId: this.id },
            error: errors.length > 0 ? errors[0] : undefined
        };
    }
};
exports.ParallelNodeActivity = ParallelNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], ParallelNodeActivity.prototype, "branches", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ParallelNodeActivity.prototype, "maxConcurrent", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ParallelNodeActivity.prototype, "waitAll", void 0);
exports.ParallelNodeActivity = ParallelNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'parallel-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], ParallelNodeActivity);
let DelayNodeActivity = class DelayNodeActivity extends VisualNodeActivity {
    constructor() {
        super();
        this.delay = 1000;
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
    async execute(context) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
        return {
            success: true,
            data: { delayed: this.delay, nodeId: this.id }
        };
    }
};
exports.DelayNodeActivity = DelayNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], DelayNodeActivity.prototype, "delay", void 0);
exports.DelayNodeActivity = DelayNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'delay-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], DelayNodeActivity);
let LoopNodeActivity = class LoopNodeActivity extends VisualNodeActivity {
    constructor() {
        super();
        this.maxIterations = 1000;
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
    async execute(context) {
        const results = [];
        let iteration = 0;
        while (iteration < this.maxIterations) {
            const shouldContinue = await this.condition(context, iteration);
            if (!shouldContinue)
                break;
            const result = await this.body.execute(context);
            results.push(result);
            iteration++;
        }
        return {
            success: true,
            data: { iterations: iteration, results, nodeId: this.id }
        };
    }
};
exports.LoopNodeActivity = LoopNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], LoopNodeActivity.prototype, "body", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], LoopNodeActivity.prototype, "condition", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], LoopNodeActivity.prototype, "maxIterations", void 0);
exports.LoopNodeActivity = LoopNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'loop-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], LoopNodeActivity);
let SwitchNodeActivity = class SwitchNodeActivity extends VisualNodeActivity {
    constructor() {
        super();
        this.cases = new Map();
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
    async execute(context) {
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
};
exports.SwitchNodeActivity = SwitchNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], SwitchNodeActivity.prototype, "value", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Map)
], SwitchNodeActivity.prototype, "cases", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], SwitchNodeActivity.prototype, "defaultCase", void 0);
exports.SwitchNodeActivity = SwitchNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'switch-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], SwitchNodeActivity);
let TryCatchNodeActivity = class TryCatchNodeActivity extends VisualNodeActivity {
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
    async execute(context) {
        let result;
        let caughtError;
        try {
            result = await this.tryActivity.execute(context);
        }
        catch (error) {
            caughtError = error;
            if (this.catchActivity) {
                result = await this.catchActivity.execute(context);
            }
            else {
                result = {
                    success: false,
                    error: caughtError,
                    data: { nodeId: this.id }
                };
            }
        }
        finally {
            if (this.finallyActivity) {
                await this.finallyActivity.execute(context);
            }
        }
        return {
            ...result,
            data: { ...result.data, caughtError, nodeId: this.id }
        };
    }
};
exports.TryCatchNodeActivity = TryCatchNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], TryCatchNodeActivity.prototype, "tryActivity", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], TryCatchNodeActivity.prototype, "catchActivity", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], TryCatchNodeActivity.prototype, "finallyActivity", void 0);
exports.TryCatchNodeActivity = TryCatchNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'trycatch-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], TryCatchNodeActivity);
let SubProcessNodeActivity = class SubProcessNodeActivity extends VisualNodeActivity {
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
    async execute(context) {
        return {
            success: true,
            data: { subprocess: this.workflow.name, nodeId: this.id }
        };
    }
};
exports.SubProcessNodeActivity = SubProcessNodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], SubProcessNodeActivity.prototype, "workflow", void 0);
exports.SubProcessNodeActivity = SubProcessNodeActivity = tslib_1.__decorate([
    (0, components_1.Component)({ selector: 'subprocess-node' }),
    tslib_1.__metadata("design:paramtypes", [])
], SubProcessNodeActivity);
//# sourceMappingURL=VisualNodeActivity.js.map