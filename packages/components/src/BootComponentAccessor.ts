import { BootTargetAccessor, BootContext } from '@tsdi/boot';
import { Injectable, isArray, lang } from '@tsdi/ioc';
import { ComponentManager } from './ComponentManager';

@Injectable()
export class BootComponentAccessor extends BootTargetAccessor {

    getBoot(target: any, ctx?: BootContext) {
        let composite = ctx.getRaiseContainer().resolve(ComponentManager)
            .getLeaf(target);
        return (isArray(composite) ? lang.first(composite) : composite) || target;
    }
}
