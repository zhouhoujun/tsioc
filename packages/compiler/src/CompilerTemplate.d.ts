import { Type, AbstractType } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { MergedCompilerOptions, RuntimeEnvironment } from './TsConfigReader';
export type ActivityType = Type<Activity> | AbstractType<Activity>;
export interface ConditionalDirective {
    if?: (context: CompilerTemplateContext) => boolean;
    unless?: (context: CompilerTemplateContext) => boolean;
}
export interface ActivityTemplateNode {
    type: ActivityType;
    name?: string;
    config?: Record<string, any>;
    directive?: ConditionalDirective;
    children?: ActivityTemplateNode[];
}
export interface CompilerTemplateContext extends ActivityContext {
    options: MergedCompilerOptions;
    runtime: RuntimeEnvironment;
    files?: string[];
    [key: string]: any;
}
export interface CompilerTemplate {
    id?: string;
    name: string;
    description?: string;
    version?: string;
    nodes: ActivityTemplateNode[];
    defaultOptions?: Partial<MergedCompilerOptions>;
    runtime?: RuntimeEnvironment;
}
export interface CompilerTemplateResult extends ActivityResult {
    templateId?: string;
    executedNodes: string[];
    skippedNodes: string[];
    duration: number;
}
export declare class CompilerTemplateBuilder {
    private template;
    private nodeIndex;
    constructor(name: string);
    id(id: string): this;
    description(desc: string): this;
    version(version: string): this;
    runtime(runtime: RuntimeEnvironment): this;
    defaultOptions(options: Partial<MergedCompilerOptions>): this;
    addActivity(type: ActivityType, config?: Record<string, any>, directive?: ConditionalDirective): this;
    addIfActivity(condition: (ctx: CompilerTemplateContext) => boolean, type: ActivityType, config?: Record<string, any>): this;
    addUnlessActivity(condition: (ctx: CompilerTemplateContext) => boolean, type: ActivityType, config?: Record<string, any>): this;
    addSourceFiles(directive?: ConditionalDirective): this;
    addComponentParse(directive?: ConditionalDirective): this;
    addAnnotationCompile(directive?: ConditionalDirective): this;
    addEsbuildBuild(directive?: ConditionalDirective): this;
    addDeclarationGenerate(directive?: ConditionalDirective): this;
    addMetadataGenerate(directive?: ConditionalDirective): this;
    addNode(node: ActivityTemplateNode): this;
    build(): CompilerTemplate;
    static create(name: string): CompilerTemplateBuilder;
}
export declare function createCompilerTemplate(name: string, nodes: ActivityTemplateNode[], options?: Partial<CompilerTemplate>): CompilerTemplate;
export declare const CompilerDirectives: {
    ifDeclaration: (ctx: CompilerTemplateContext) => boolean;
    ifNoDeclaration: (ctx: CompilerTemplateContext) => boolean;
    ifBundle: (ctx: CompilerTemplateContext) => boolean;
    ifNoBundle: (ctx: CompilerTemplateContext) => boolean;
    ifMinify: (ctx: CompilerTemplateContext) => boolean;
    ifProduction: (ctx: CompilerTemplateContext) => boolean;
    ifDevelopment: (ctx: CompilerTemplateContext) => boolean;
    ifBrowser: (ctx: CompilerTemplateContext) => boolean;
    ifNode: (ctx: CompilerTemplateContext) => boolean;
    ifESM: (ctx: CompilerTemplateContext) => boolean;
    ifCJS: (ctx: CompilerTemplateContext) => boolean;
    ifHasComponents: (ctx: CompilerTemplateContext) => boolean;
};
export declare function createDefaultCompilerTemplate(name?: string): CompilerTemplate;
export declare function createProductionCompilerTemplate(): CompilerTemplate;
export declare function createDevelopmentCompilerTemplate(): CompilerTemplate;
