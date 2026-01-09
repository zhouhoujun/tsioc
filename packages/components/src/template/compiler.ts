import { Abstract } from '@tsdi/ioc';
import { ReactiveEffect, noReact } from '../effect';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';
import { EnvironmentContext } from '../refs/environment';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    templateTag?: string;
    containerTag?: string;
}

@Abstract()
export abstract class TemplateCompiler<T = string> {

    [noReact] = true;

    abstract get effect(): ReactiveEffect;

    abstract get renderer(): Renderer;

    abstract compile<C>(template: T, context: C, environment: EnvironmentContext): Promise<EmbeddedViewRef<C>>;
}
