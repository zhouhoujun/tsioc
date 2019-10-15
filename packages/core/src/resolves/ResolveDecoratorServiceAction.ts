import { isClassType } from '@tsdi/ioc';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { ResolveServiceContext } from './ResolveServiceContext';

export class ResolveDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (isClassType(ctx.currTargetType)) {
            let dprvoider = this.container.getDecoratorProvider();
            ctx.reflects.getDecorators(ctx.currTargetType, 'class')
                .some(dec => {
                    if (dprvoider.has(dec)) {
                        ctx.instance = dprvoider.resolve(dec, ctx.currToken || ctx.token, ...ctx.providers || []);
                        return !!ctx.instance;
                    } else {
                        return false;
                    }
                });
        }

        if (!ctx.instance) {
            ctx.currDecorator = null;
            return next();
        }
    }
}
