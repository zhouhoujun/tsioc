import { Abstract } from '@tsdi/ioc';
import { noReact } from '../effect';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';
import { EnvironmentContext } from '../refs/environment';
import { RNode } from '../renderer/Node';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    templateTag?: string;
    containerTag?: string;
}

@Abstract()
export abstract class TemplateCompiler<T = string> {

    [noReact] = true;

    abstract get renderer(): Renderer;

    abstract compileNodes<C>(nodes: RNode[], context: C, environment: EnvironmentContext): EmbeddedViewRef<C>

    abstract compile<C>(template: T, context: C, environment: EnvironmentContext): EmbeddedViewRef<C>;
}
