import { BuildContext } from './BuildContext';
import { ResolveHandle } from './ResolveHandle';
import { AfterContentInit } from '../../core';
import { isFunction } from '@tsdi/ioc';


export class ModuleAfterContentInitHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {

        let target = ctx.target as AfterContentInit;
        if (target && isFunction(target.onAfterContentInit)) {
            await target.onAfterContentInit();
        }

        if (next) {
            await next();
        }
    }
}
