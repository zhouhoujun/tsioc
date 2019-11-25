import { lang, isClass } from '@tsdi/ioc';
import { InjectorAction, InjectorActionContext, CTX_CURR_TYPE } from '@tsdi/core';
import { RegisterForMetadata, RegisterFor } from '../decorators';
import { RegFor } from '../modules';
import { ContainerPoolToken } from '../ContainerPoolToken';

export class RegForInjectorAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {
        let currType = ctx.get(CTX_CURR_TYPE);
        let currDecor = ctx.currDecoractor;
        if (isClass(currType)
            && currDecor
            && ctx.reflects.hasMetadata(RegisterFor, currType)) {
            let meta = lang.first(ctx.reflects.getMetadata<RegisterForMetadata>(RegisterFor, currType));
            if (meta && meta.regFor) {
                let pools = this.container.get(ContainerPoolToken);
                switch (meta.regFor) {
                    case RegFor.root:
                        pools.getRoot().register(currType);
                        break;
                    case RegFor.child:
                        ctx.getContainer().register(currType);
                        break;
                    case RegFor.boot:
                    default:
                        this.container.register(currType);
                        break;
                }
            }
        } else {
            next();
        }
    }
}
