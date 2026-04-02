import { Activity, ActivityContext, ActivityResult, SequenceActivity } from '@tsdi/activities';
import { Type, AbstractType, Injectable } from '@tsdi/ioc';
import {
    CompilerTemplate,
    CompilerTemplateContext,
    CompilerTemplateResult,
    ActivityTemplateNode,
    ConditionalDirective
} from './CompilerTemplate';
import { TsConfigReader, MergedCompilerOptions, RuntimeEnvironment } from './TsConfigReader';

@Injectable()
export class CompilerTemplateExecutor {
    private tsConfigReader: TsConfigReader;

    constructor(tsConfigPath?: string) {
        this.tsConfigReader = new TsConfigReader(tsConfigPath);
    }

    async execute(
        template: CompilerTemplate,
        runtime?: RuntimeEnvironment
    ): Promise<CompilerTemplateResult> {
        const startTime = Date.now();
        const executedNodes: string[] = [];
        const skippedNodes: string[] = [];

        try {
            const options = this.resolveOptions(template, runtime);
            const context: CompilerTemplateContext = {
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

            const sequence = new SequenceActivity();
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
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                executedNodes,
                skippedNodes,
                duration: Date.now() - startTime,
                templateId: template.id
            };
        }
    }

    private resolveOptions(
        template: CompilerTemplate,
        runtime?: RuntimeEnvironment
    ): MergedCompilerOptions {
        const tsConfigOptions = this.tsConfigReader.mergeWithRuntime(runtime || {});
        
        if (template.defaultOptions) {
            return { ...tsConfigOptions, ...template.defaultOptions };
        }

        return tsConfigOptions;
    }

    private async buildActivities(
        nodes: ActivityTemplateNode[],
        context: CompilerTemplateContext,
        executedNodes: string[],
        skippedNodes: string[]
    ): Promise<Activity[]> {
        const activities: Activity[] = [];

        for (const node of nodes) {
            const shouldExecute = this.evaluateDirective(node.directive, context);
            const nodeName = node.name || node.type.name;

            if (shouldExecute) {
                const activity = await this.createActivity(node, context);
                if (activity) {
                    activities.push(activity);
                    executedNodes.push(nodeName);
                }
            } else {
                skippedNodes.push(nodeName);
            }
        }

        return activities;
    }

    private evaluateDirective(
        directive: ConditionalDirective | undefined,
        context: CompilerTemplateContext
    ): boolean {
        if (!directive) return true;

        if (directive.if && !directive.if(context)) {
            return false;
        }

        if (directive.unless && directive.unless(context)) {
            return false;
        }

        return true;
    }

    private async createActivity(
        node: ActivityTemplateNode,
        context: CompilerTemplateContext
    ): Promise<Activity | null> {
        try {
            const ActivityClass = node.type as any;
            const activity = new ActivityClass();

            if (node.config) {
                const resolvedConfig = this.resolveConfig(node.config, context);
                Object.assign(activity, resolvedConfig);
            }

            return activity;
        } catch (error) {
            console.error(`Failed to create activity ${node.name}:`, error);
            return null;
        }
    }

    private resolveConfig(
        config: Record<string, any>,
        context: CompilerTemplateContext
    ): Record<string, any> {
        const resolved: Record<string, any> = {};

        for (const [key, value] of Object.entries(config)) {
            resolved[key] = this.resolveValue(value, context);
        }

        return resolved;
    }

    private resolveValue(value: any, context: CompilerTemplateContext): any {
        if (typeof value === 'string') {
            return this.interpolateString(value, context);
        }

        if (Array.isArray(value)) {
            return value.map(v => this.resolveValue(v, context));
        }

        if (typeof value === 'object' && value !== null) {
            const resolved: Record<string, any> = {};
            for (const [k, v] of Object.entries(value)) {
                resolved[k] = this.resolveValue(v, context);
            }
            return resolved;
        }

        return value;
    }

    private interpolateString(template: string, context: CompilerTemplateContext): any {
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

    private getValueByPath(obj: any, path: string): any {
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

    setTsConfigPath(path: string): void {
        this.tsConfigReader = new TsConfigReader(path);
    }

    getMergedOptions(runtime?: RuntimeEnvironment): MergedCompilerOptions {
        return this.tsConfigReader.mergeWithRuntime(runtime || {});
    }

    getTsConfigReader(): TsConfigReader {
        return this.tsConfigReader;
    }
}