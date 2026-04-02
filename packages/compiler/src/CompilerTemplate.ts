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

export class CompilerTemplateBuilder {
    private template: CompilerTemplate;
    private nodeIndex = 0;

    constructor(name: string) {
        this.template = {
            name,
            nodes: []
        };
    }

    id(id: string): this {
        this.template.id = id;
        return this;
    }

    description(desc: string): this {
        this.template.description = desc;
        return this;
    }

    version(version: string): this {
        this.template.version = version;
        return this;
    }

    runtime(runtime: RuntimeEnvironment): this {
        this.template.runtime = runtime;
        return this;
    }

    defaultOptions(options: Partial<MergedCompilerOptions>): this {
        this.template.defaultOptions = options;
        return this;
    }

    addActivity(
        type: ActivityType,
        config?: Record<string, any>,
        directive?: ConditionalDirective
    ): this {
        this.template.nodes.push({
            type,
            name: config?.name || `activity_${this.nodeIndex++}`,
            config,
            directive
        });
        return this;
    }

    addIfActivity(
        condition: (ctx: CompilerTemplateContext) => boolean,
        type: ActivityType,
        config?: Record<string, any>
    ): this {
        return this.addActivity(type, config, { if: condition });
    }

    addUnlessActivity(
        condition: (ctx: CompilerTemplateContext) => boolean,
        type: ActivityType,
        config?: Record<string, any>
    ): this {
        return this.addActivity(type, config, { unless: condition });
    }

    addSourceFiles(directive?: ConditionalDirective): this {
        return this.addActivity(
            require('./activities/SourceFilesActivity').SourceFilesActivity,
            { src: '{{options.src}}', exclude: '{{options.exclude}}' },
            directive
        );
    }

    addComponentParse(directive?: ConditionalDirective): this {
        return this.addActivity(
            require('./activities/ComponentParseActivity').ComponentParseActivity,
            { src: '{{options.src}}', exclude: '{{options.exclude}}' },
            directive
        );
    }

    addAnnotationCompile(directive?: ConditionalDirective): this {
        return this.addActivity(
            require('./activities/AnnotationCompileActivity').AnnotationCompileActivity,
            { src: '{{options.src}}', outDir: '{{options.outDir}}', exclude: '{{options.exclude}}' },
            directive
        );
    }

    addEsbuildBuild(directive?: ConditionalDirective): this {
        return this.addActivity(
            require('./activities/EsbuildBuildActivity').EsbuildBuildActivity,
            {
                src: '{{options.src}}',
                outDir: '{{options.outDir}}',
                target: '{{options.target}}',
                format: '{{options.format}}',
                platform: '{{options.platform}}',
                bundle: '{{options.bundle}}',
                minify: '{{options.minify}}',
                sourcemap: '{{options.sourcemap}}',
                exclude: '{{options.exclude}}'
            },
            directive
        );
    }

    addDeclarationGenerate(directive?: ConditionalDirective): this {
        return this.addActivity(
            require('./activities/DeclarationGenerateActivity').DeclarationGenerateActivity,
            { src: '{{options.src}}', outDir: '{{options.outDir}}', exclude: '{{options.exclude}}' },
            directive
        );
    }

    addMetadataGenerate(directive?: ConditionalDirective): this {
        return this.addActivity(
            require('./activities/MetadataGenerateActivity').MetadataGenerateActivity,
            { src: '{{options.src}}', outDir: '{{options.outDir}}', exclude: '{{options.exclude}}' },
            directive
        );
    }

    addNode(node: ActivityTemplateNode): this {
        this.template.nodes.push({
            ...node,
            name: node.name || `activity_${this.nodeIndex++}`
        });
        return this;
    }

    build(): CompilerTemplate {
        return this.template;
    }

    static create(name: string): CompilerTemplateBuilder {
        return new CompilerTemplateBuilder(name);
    }
}

export function createCompilerTemplate(
    name: string,
    nodes: ActivityTemplateNode[],
    options?: Partial<CompilerTemplate>
): CompilerTemplate {
    return {
        name,
        nodes,
        ...options
    };
}

export const CompilerDirectives = {
    ifDeclaration: (ctx: CompilerTemplateContext) => ctx.options.declaration === true,
    ifNoDeclaration: (ctx: CompilerTemplateContext) => ctx.options.declaration !== true,
    ifBundle: (ctx: CompilerTemplateContext) => ctx.options.bundle === true,
    ifNoBundle: (ctx: CompilerTemplateContext) => ctx.options.bundle !== true,
    ifMinify: (ctx: CompilerTemplateContext) => ctx.options.minify === true,
    ifProduction: (ctx: CompilerTemplateContext) => ctx.runtime?.mode === 'production',
    ifDevelopment: (ctx: CompilerTemplateContext) => ctx.runtime?.mode === 'development',
    ifBrowser: (ctx: CompilerTemplateContext) => ctx.options.platform === 'browser',
    ifNode: (ctx: CompilerTemplateContext) => ctx.options.platform === 'node',
    ifESM: (ctx: CompilerTemplateContext) => ctx.options.format === 'esm',
    ifCJS: (ctx: CompilerTemplateContext) => ctx.options.format === 'cjs',
    ifHasComponents: (ctx: CompilerTemplateContext) => (ctx.files?.length ?? 0) > 0
};

export function createDefaultCompilerTemplate(name: string = 'Default Compiler'): CompilerTemplate {
    return CompilerTemplateBuilder
        .create(name)
        .description('Default compilation workflow with conditional steps')
        .addSourceFiles()
        .addComponentParse({ if: CompilerDirectives.ifHasComponents })
        .addAnnotationCompile()
        .addEsbuildBuild()
        .addDeclarationGenerate({ if: CompilerDirectives.ifDeclaration })
        .build();
}

export function createProductionCompilerTemplate(): CompilerTemplate {
    return CompilerTemplateBuilder
        .create('Production Compiler')
        .description('Production compilation with minification and bundling')
        .runtime({ mode: 'production', minify: true, bundle: true })
        .addSourceFiles()
        .addComponentParse({ if: CompilerDirectives.ifHasComponents })
        .addAnnotationCompile()
        .addEsbuildBuild({ if: CompilerDirectives.ifBundle })
        .addDeclarationGenerate({ if: CompilerDirectives.ifDeclaration })
        .build();
}

export function createDevelopmentCompilerTemplate(): CompilerTemplate {
    return CompilerTemplateBuilder
        .create('Development Compiler')
        .description('Development compilation with source maps')
        .runtime({ mode: 'development', sourcemap: true })
        .addSourceFiles()
        .addComponentParse({ if: CompilerDirectives.ifHasComponents })
        .addAnnotationCompile()
        .addEsbuildBuild()
        .addDeclarationGenerate({ if: CompilerDirectives.ifDeclaration })
        .build();
}