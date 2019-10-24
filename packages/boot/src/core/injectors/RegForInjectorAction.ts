import { lang, isClass } from '@tsdi/ioc';
import { InjectorAction, InjectorActionContext } from '@tsdi/core';
import { RegisterForMetadata, RegisterFor } from '../decorators';
import { RegFor } from '../modules';
import { ContainerPoolToken } from '../ContainerPoolToken';

export class RegForInjectorAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {

        if (isClass(ctx.currType)
            && ctx.currDecoractor
            && ctx.reflects.hasMetadata(RegisterFor, ctx.currType)) {
            let meta = lang.first(ctx.reflects.getMetadata<RegisterForMetadata>(RegisterFor, ctx.currType));
            if (meta && meta.regFor) {
                let pools = this.container.get(ContainerPoolToken);
                switch (meta.regFor) {
                    case RegFor.root:
                        pools.getRoot().register(ctx.currType);
                        break;
                    case RegFor.child:
                        ctx.getRaiseContainer().register(ctx.currType);
                        break;
                    case RegFor.boot:
                    default:
                        this.container.register(ctx.currType);
                        break;
                }
            }
        } else {
            next();
        }
    }
}
