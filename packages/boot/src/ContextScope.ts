import { BootContext } from './BootContext';
import { IContextScope, ContextScopeToken } from './IContextScope';
import { Singleton } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';


@Singleton(ContextScopeToken)
export class ContextScope implements IContextScope<BootContext> {

    getScopes(container: IContainer, scope: any): any[] {
        return [];
    }

    getBoot(ctx: BootContext) {
        return ctx.bootstrap || ctx.target;
    }
}
