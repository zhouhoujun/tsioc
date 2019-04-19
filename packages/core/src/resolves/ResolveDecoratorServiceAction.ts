import { Singleton, isClassType, MetadataService } from '@tsdi/ioc';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ServiceDecoratorRegisterer } from '../services';

@Singleton
export class ResolveDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        if (isClassType(ctx.currTargetType)) {
            let decReg = this.container.get(ServiceDecoratorRegisterer);
            if (decReg.size > 0) {
                this.container
                    .get(MetadataService)
                    .getClassDecorators(ctx.currTargetType)
                    .some(dec => {
                        if (decReg.has(dec)) {
                            this.execActions(ctx, decReg.get(dec));
                            return !!ctx.instance;
                        } else {
                            return false;
                        }
                    });
            }
        }

        if (!ctx.instance) {
            return next();
        }
    }
}
