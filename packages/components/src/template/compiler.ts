import { Abstract, InvocationContext, tokenId } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ViewRef } from '../refs/view';
import { Renderer } from '../renderer/Renderer';

export interface TemplateCompilerOptions {
    delimiters?: [string, string];
}

export const COMPILER_OPTIONS = tokenId<TemplateCompilerOptions>('COMPILER_OPTIONS');

@Abstract()
export abstract class TemplateCompiler {

    abstract get effect(): ReactiveEffect;

    abstract get renderer(): Renderer;

    abstract compile(template: string, context: any, environument: InvocationContext): Promise<ViewRef>;
}
