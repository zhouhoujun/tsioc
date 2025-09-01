import { Abstract, InvocationContext, tokenId } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
}

export const DIRECTIVES = tokenId<Function[]>('DIRECTIVES');

@Abstract()
export abstract class TemplateCompiler {

    abstract get effect(): ReactiveEffect;

    abstract get renderer(): Renderer;

    abstract compile(template: string, context: any, environument: InvocationContext): Promise<ViewRef>;
}
