import { TemplateParser } from '../template/parser';
import { RNode } from '../renderer/Node';
import { ModuleWithProviders, ProvdierOf } from '@tsdi/ioc';
import { AbstractTemplateCompiler } from './compiler';
import { ReactiveEffect, noReact } from '../effect';
import { TemplateCompilerOptions } from '../template/compiler';
import { Renderer } from '../renderer/Renderer';
export declare abstract class HtmlRenderer extends Renderer {
}
export declare abstract class HtmlTemplateParser implements TemplateParser {
    protected renderer: HtmlRenderer;
    [noReact]: boolean;
    constructor(renderer: HtmlRenderer);
    abstract parse(template: string): RNode[];
}
export interface HtmlTemplateCompilerOptions extends TemplateCompilerOptions {
    renderer?: ProvdierOf<HtmlRenderer>;
}
export declare const HTML_COMPILER_OPTIONS: import("@tsdi/ioc").InjectToken<HtmlTemplateCompilerOptions>;
export declare class HtmlTemplateCompiler extends AbstractTemplateCompiler {
    readonly effect: ReactiveEffect;
    readonly renderer: HtmlRenderer;
    readonly parser: HtmlTemplateParser;
    protected options: HtmlTemplateCompilerOptions;
    constructor(effect: ReactiveEffect, renderer: HtmlRenderer, parser: HtmlTemplateParser, options: HtmlTemplateCompilerOptions);
}
export declare class HtmlTemplateModule {
    static withOptions(options: HtmlTemplateCompilerOptions): ModuleWithProviders<HtmlTemplateModule>;
}
