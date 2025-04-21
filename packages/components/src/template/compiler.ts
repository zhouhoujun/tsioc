import { Abstract } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';


export interface TemplateCompilerOptions {
    delimiters?: [string, string];
    directives?: Record<string, Function>;
}

@Abstract()
export abstract class TemplateCompiler {
    
    abstract get effect(): ReactiveEffect;

    abstract compile(template: string, context: any): DocumentFragment;
}
