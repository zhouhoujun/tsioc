import { Abstract } from '@tsdi/ioc';
import { noReact } from '../effect';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';
import { EnvironmentContext } from '../refs/environment';
import { RNode } from '../renderer/Node';
import { BindingFactory, TemplateRef } from '../refs/template';
import { TemplateParser } from './parser';
import { DirectiveDef, DirectiveRef } from '../refs/directive';
import { ComponentDef } from '../refs/component';
import { ElementRef } from '../refs/element';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    templateTag?: string;
    containerTag?: string;
}

export interface CompilerOptions {
    host: ElementRef;
    directives: DirectiveDef[];
    components: ComponentDef[];
}

@Abstract()
export abstract class TemplateCompiler<T = string> {

    [noReact] = true;

    abstract get parser(): TemplateParser;
    abstract get renderer(): Renderer;

    abstract compileNodes<C>(nodes: RNode[], options: CompilerOptions): TemplateRef<C>

    abstract compile<C>(template: T, options: CompilerOptions): TemplateRef<C>;
}



