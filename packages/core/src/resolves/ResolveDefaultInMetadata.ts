import { Singleton, isToken, isClassType, MetadataService } from '@tsdi/ioc';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ServiceDecoratorRegisterer } from '../services';

@Singleton
export class ResolveTargetDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        let currTgRef = ctx.currTargetRef;
        let targetType = isToken(currTgRef) ? currTgRef : currTgRef.getToken()
        if (isClassType(targetType)) {
            let decReg = this.container.get(ServiceDecoratorRegisterer)
            this.container
                .get(MetadataService)
                .getClassDecorators(targetType)
                .some(dec => {
                    if (decReg.has(dec)) {
                        this.execActions(ctx, decReg.get(dec), next);
                        return !!ctx.instance;
                    } else {
                        return false;
                    }
                })
        }
    }
}
