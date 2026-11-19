import { Abstract } from '@tsdi/ioc';
import { noReact } from '../effect';
import { Renderer } from '../renderer/Renderer';
import { TemplateFactory } from '../refs/template';
import { TemplateParser } from './parser';
import { DirectiveDef } from '../refs/directive';
import { ComponentDef } from '../refs/component';
import { SchemaMetadata } from './schema';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    templateTag?: string;
    containerTag?: string;
}

export interface CompilerOptions {
    customElements?: DirectiveDef[];
    directives: DirectiveDef[];
    components: ComponentDef[];
    schemas?: SchemaMetadata[];
    /** AOT precompiled renderer-neutral template IR (JSON). */
    templateIR?: string;
    /** AOT precompiled binding instructions (object, or legacy JSON string). */
    templatePlan?: string | import('./plan').TemplatePlan;
}

@Abstract()
export abstract class TemplateCompiler<T = string> {

    [noReact] = true;

    abstract get parser(): TemplateParser;
    abstract get renderer(): Renderer;

    abstract compile<C>(template: T, options: CompilerOptions): TemplateFactory<C>;
}


