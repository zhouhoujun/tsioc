import { DesignActionContext } from '@tsdi/ioc';
import { CTX_MODULE_ANNOATION } from '../context-tokens';
import { IContainer } from '@tsdi/core';

export const RegModuleImportsAction = function (ctx: DesignActionContext, next: () => void): void {
    let annoation = ctx.get(CTX_MODULE_ANNOATION)
    if (annoation.imports) {
        ctx.getContainer<IContainer>().use(ctx.injector, ...annoation.imports);
    }
    next();
};
