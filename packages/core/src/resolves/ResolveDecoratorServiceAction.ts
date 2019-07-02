import { isClassType, MetadataService } from '@tsdi/ioc';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ServiceDecoratorRegisterer } from './ServiceDecoratorRegisterer';

export class ResolveDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (isClassType(ctx.currTargetType)) {
            let decReg = this.container.get(ServiceDecoratorRegisterer);
            if (decReg.size > 0) {
                this.container
                    .get(MetadataService)
                    .getClassDecorators(ctx.currTargetType)
                    .some(dec => {
                        if (decReg.has(dec)) {
                            ctx.currDecorator = dec;
                            this.execFuncs(ctx, decReg.getFuncs(this.container, dec));
                            return !!ctx.instance;
                        } else {
                            return false;
                        }
                    });
            }
        }

        if (!ctx.instance) {
            ctx.currDecorator = null;
            return next();
        }
    }
}
