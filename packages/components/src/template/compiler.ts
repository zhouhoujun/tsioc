import { Abstract } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';


export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    directives?: Record<string, Function>;
}

@Abstract()
export abstract class TemplateCompiler {
    
    abstract get effect(): ReactiveEffect;

    abstract get renderer(): Renderer;

    abstract compile(template: string, context: any): ViewRef;
}
