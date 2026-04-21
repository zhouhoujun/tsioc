"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerTemplateExecutor = void 0;
const tslib_1 = require("tslib");
const activities_1 = require("@tsdi/activities");
const ioc_1 = require("@tsdi/ioc");
const TsConfigReader_1 = require("./TsConfigReader");
let CompilerTemplateExecutor = class CompilerTemplateExecutor {
    constructor(tsConfigPath) {
        this.tsConfigReader = new TsConfigReader_1.TsConfigReader(tsConfigPath);
    }
    async execute(template, runtime) {
        const startTime = Date.now();
        const executedNodes = [];
        const skippedNodes = [];
        try {
            const options = this.resolveOptions(template, runtime);
            const context = {
                options,
                runtime: runtime || template.runtime || {},
                files: []
            };
            const activities = await this.buildActivities(template.nodes, context, executedNodes, skippedNodes);
            if (activities.length === 0) {
                return {
                    success: true,
                    data: { executedNodes, skippedNodes, options },
                    executedNodes,
                    skippedNodes,
                    duration: Date.now() - startTime,
                    templateId: template.id
                };
            }
            const sequence = new activities_1.SequenceActivity();
            sequence.activities = activities;
            const result = await sequence.execute(context);
            return {
                success: result.success,
                data: {
                    ...result.data,
                    executedNodes,
                    skippedNodes,
                    options
                },
                error: result.error,
                executedNodes,
                skippedNodes,
                duration: Date.now() - startTime,
                templateId: template.id
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                executedNodes,
                skippedNodes,
                duration: Date.now() - startTime,
                templateId: template.id
            };
        }
    }
    resolveOptions(template, runtime) {
        const tsConfigOptions = this.tsConfigReader.mergeWithRuntime(runtime || {});
        if (template.defaultOptions) {
            return { ...tsConfigOptions, ...template.defaultOptions };
        }
        return tsConfigOptions;
    }
    async buildActivities(nodes, context, executedNodes, skippedNodes) {
        const activities = [];
        for (const node of nodes) {
            const shouldExecute = this.evaluateDirective(node.directive, context);
            const nodeName = node.name || node.type.name;
            if (shouldExecute) {
                const activity = await this.createActivity(node, context);
                if (activity) {
                    activities.push(activity);
                    executedNodes.push(nodeName);
                }
            }
            else {
                skippedNodes.push(nodeName);
            }
        }
        return activities;
    }
    evaluateDirective(directive, context) {
        if (!directive)
            return true;
        if (directive.if && !directive.if(context)) {
            return false;
        }
        if (directive.unless && directive.unless(context)) {
            return false;
        }
        return true;
    }
    async createActivity(node, context) {
        try {
            const ActivityClass = node.type;
            const activity = new ActivityClass();
            if (node.config) {
                const resolvedConfig = this.resolveConfig(node.config, context);
                Object.assign(activity, resolvedConfig);
            }
            return activity;
        }
        catch (error) {
            console.error(`Failed to create activity ${node.name}:`, error);
            return null;
        }
    }
    resolveConfig(config, context) {
        const resolved = {};
        for (const [key, value] of Object.entries(config)) {
            resolved[key] = this.resolveValue(value, context);
        }
        return resolved;
    }
    resolveValue(value, context) {
        if (typeof value === 'string') {
            return this.interpolateString(value, context);
        }
        if (Array.isArray(value)) {
            return value.map(v => this.resolveValue(v, context));
        }
        if (typeof value === 'object' && value !== null) {
            const resolved = {};
            for (const [k, v] of Object.entries(value)) {
                resolved[k] = this.resolveValue(v, context);
            }
            return resolved;
        }
        return value;
    }
    interpolateString(template, context) {
        const match = template.match(/^\{\{(.+?)\}\}$/);
        if (match) {
            const path = match[1].trim();
            return this.getValueByPath(context, path);
        }
        return template.replace(/\{\{(.+?)\}\}/g, (_, path) => {
            const value = this.getValueByPath(context, path.trim());
            return value !== undefined ? String(value) : '';
        });
    }
    getValueByPath(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    setTsConfigPath(path) {
        this.tsConfigReader = new TsConfigReader_1.TsConfigReader(path);
    }
    getMergedOptions(runtime) {
        return this.tsConfigReader.mergeWithRuntime(runtime || {});
    }
    getTsConfigReader() {
        return this.tsConfigReader;
    }
};
exports.CompilerTemplateExecutor = CompilerTemplateExecutor;
exports.CompilerTemplateExecutor = CompilerTemplateExecutor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [String])
], CompilerTemplateExecutor);
//# sourceMappingURL=CompilerTemplateExecutor.js.map