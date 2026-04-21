import { noReact } from '../effect';
import { Renderer } from '../renderer/Renderer';
import { TemplateFactory } from '../refs/template';
import { TemplateParser } from './parser';
import { DirectiveDef } from '../refs/directive';
import { ComponentDef } from '../refs/component';
export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    templateTag?: string;
    containerTag?: string;
}
export interface CompilerOptions {
    customElements?: DirectiveDef[];
    directives: DirectiveDef[];
    components: ComponentDef[];
}
export declare abstract class TemplateCompiler<T = string> {
    [noReact]: boolean;
    abstract get parser(): TemplateParser;
    abstract get renderer(): Renderer;
    abstract compile<C>(template: T, options: CompilerOptions): TemplateFactory<C>;
}
