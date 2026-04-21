"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerDirectives = exports.CompilerTemplateBuilder = void 0;
exports.createCompilerTemplate = createCompilerTemplate;
exports.createDefaultCompilerTemplate = createDefaultCompilerTemplate;
exports.createProductionCompilerTemplate = createProductionCompilerTemplate;
exports.createDevelopmentCompilerTemplate = createDevelopmentCompilerTemplate;
class CompilerTemplateBuilder {
    constructor(name) {
        this.nodeIndex = 0;
        this.template = {
            name,
            nodes: []
        };
    }
    id(id) {
        this.template.id = id;
        return this;
    }
    description(desc) {
        this.template.description = desc;
        return this;
    }
    version(version) {
        this.template.version = version;
        return this;
    }
    runtime(runtime) {
        this.template.runtime = runtime;
        return this;
    }
    defaultOptions(options) {
        this.template.defaultOptions = options;
        return this;
    }
    addActivity(type, config, directive) {
        this.template.nodes.push({
            type,
            name: config?.name || `activity_${this.nodeIndex++}`,
            config,
            directive
        });
        return this;
    }
    addIfActivity(condition, type, config) {
        return this.addActivity(type, config, { if: condition });
    }
    addUnlessActivity(condition, type, config) {
        return this.addActivity(type, config, { unless: condition });
    }
    addSourceFiles(directive) {
        return this.addActivity(require('./activities/SourceFilesActivity').SourceFilesActivity, { src: '{{options.src}}', exclude: '{{options.exclude}}' }, directive);
    }
    addComponentParse(directive) {
        return this.addActivity(require('./activities/ComponentParseActivity').ComponentParseActivity, { src: '{{options.src}}', exclude: '{{options.exclude}}' }, directive);
    }
    addAnnotationCompile(directive) {
        return this.addActivity(require('./activities/AnnotationCompileActivity').AnnotationCompileActivity, { src: '{{options.src}}', outDir: '{{options.outDir}}', exclude: '{{options.exclude}}' }, directive);
    }
    addEsbuildBuild(directive) {
        return this.addActivity(require('./activities/EsbuildBuildActivity').EsbuildBuildActivity, {
            src: '{{options.src}}',
            outDir: '{{options.outDir}}',
            target: '{{options.target}}',
            format: '{{options.format}}',
            platform: '{{options.platform}}',
            bundle: '{{options.bundle}}',
            minify: '{{options.minify}}',
            sourcemap: '{{options.sourcemap}}',
            exclude: '{{options.exclude}}'
        }, directive);
    }
    addDeclarationGenerate(directive) {
        return this.addActivity(require('./activities/DeclarationGenerateActivity').DeclarationGenerateActivity, { src: '{{options.src}}', outDir: '{{options.outDir}}', exclude: '{{options.exclude}}' }, directive);
    }
    addMetadataGenerate(directive) {
        return this.addActivity(require('./activities/MetadataGenerateActivity').MetadataGenerateActivity, { src: '{{options.src}}', outDir: '{{options.outDir}}', exclude: '{{options.exclude}}' }, directive);
    }
    addNode(node) {
        this.template.nodes.push({
            ...node,
            name: node.name || `activity_${this.nodeIndex++}`
        });
        return this;
    }
    build() {
        return this.template;
    }
    static create(name) {
        return new CompilerTemplateBuilder(name);
    }
}
exports.CompilerTemplateBuilder = CompilerTemplateBuilder;
function createCompilerTemplate(name, nodes, options) {
    return {
        name,
        nodes,
        ...options
    };
}
exports.CompilerDirectives = {
    ifDeclaration: (ctx) => ctx.options.declaration === true,
    ifNoDeclaration: (ctx) => ctx.options.declaration !== true,
    ifBundle: (ctx) => ctx.options.bundle === true,
    ifNoBundle: (ctx) => ctx.options.bundle !== true,
    ifMinify: (ctx) => ctx.options.minify === true,
    ifProduction: (ctx) => ctx.runtime?.mode === 'production',
    ifDevelopment: (ctx) => ctx.runtime?.mode === 'development',
    ifBrowser: (ctx) => ctx.options.platform === 'browser',
    ifNode: (ctx) => ctx.options.platform === 'node',
    ifESM: (ctx) => ctx.options.format === 'esm',
    ifCJS: (ctx) => ctx.options.format === 'cjs',
    ifHasComponents: (ctx) => (ctx.files?.length ?? 0) > 0
};
function createDefaultCompilerTemplate(name = 'Default Compiler') {
    return CompilerTemplateBuilder
        .create(name)
        .description('Default compilation workflow with conditional steps')
        .addSourceFiles()
        .addComponentParse({ if: exports.CompilerDirectives.ifHasComponents })
        .addAnnotationCompile()
        .addEsbuildBuild()
        .addDeclarationGenerate({ if: exports.CompilerDirectives.ifDeclaration })
        .build();
}
function createProductionCompilerTemplate() {
    return CompilerTemplateBuilder
        .create('Production Compiler')
        .description('Production compilation with minification and bundling')
        .runtime({ mode: 'production', minify: true, bundle: true })
        .addSourceFiles()
        .addComponentParse({ if: exports.CompilerDirectives.ifHasComponents })
        .addAnnotationCompile()
        .addEsbuildBuild({ if: exports.CompilerDirectives.ifBundle })
        .addDeclarationGenerate({ if: exports.CompilerDirectives.ifDeclaration })
        .build();
}
function createDevelopmentCompilerTemplate() {
    return CompilerTemplateBuilder
        .create('Development Compiler')
        .description('Development compilation with source maps')
        .runtime({ mode: 'development', sourcemap: true })
        .addSourceFiles()
        .addComponentParse({ if: exports.CompilerDirectives.ifHasComponents })
        .addAnnotationCompile()
        .addEsbuildBuild()
        .addDeclarationGenerate({ if: exports.CompilerDirectives.ifDeclaration })
        .build();
}
//# sourceMappingURL=CompilerTemplate.js.map