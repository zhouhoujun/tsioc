import { Abstract, InvocationContext, tokenId } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';
import { ComponentRef } from '../refs/component';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
}

export const COMPONENTS = tokenId<((environument: InvocationContext) => ComponentRef<any>)[]>('COMPONENTS');
export const DIRECTIVES = tokenId<((environument: InvocationContext) => ComponentRef<any>)[]>('DIRECTIVES');

@Abstract()
export abstract class TemplateCompiler {

    abstract get effect(): ReactiveEffect;

    abstract get renderer(): Renderer;

    abstract compile(template: string, context: any, environument: InvocationContext): Promise<ViewRef>;
}
