import { ResolveServiceContext, IocResolveServiceAction } from '@tsdi/core';
import { isClassType, InjectReference, lang } from '@tsdi/ioc';
import { BootContext } from '@tsdi/boot';


export class SuiteDecoratorRegisterer extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        if (!isClassType(ctx.currTargetType)) {
            return next();
        }
        let stype = this.container.getTokenProvider(ctx.currToken || ctx.token);
        if (!ctx.instance && lang.isExtendsClass(stype, BootContext)) {
            let ref = new InjectReference(BootContext, ctx.currDecorator);
            if (this.container.has(ref)) {
                this.resolve(ctx, ref);
            }
        }
        if (!ctx.instance) {
            next();
        }
    }
}
