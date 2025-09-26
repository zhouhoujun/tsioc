import { Abstract } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';
import { EnvironmentContext } from '../refs/environment';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    templateTag?: string;
    containerTag?: string;
}

@Abstract()
export abstract class TemplateCompiler {

    abstract get effect(): ReactiveEffect;

    abstract get renderer(): Renderer;

    abstract compile(template: string, context: any, environment: EnvironmentContext): Promise<ViewRef>;
}
