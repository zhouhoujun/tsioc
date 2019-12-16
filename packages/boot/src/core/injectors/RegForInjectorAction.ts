import { lang, isClass, CTX_CURR_DECOR, InjectorFactory, InjectorToken } from '@tsdi/ioc';
import { InjectorAction, InjectorActionContext, CTX_CURR_TYPE } from '@tsdi/core';
import { RegisterForMetadata, RegisterFor } from '../decorators/RegisterFor';
import { ParentInjectorToken } from '../modules/IModuleReflect';


export class RegForInjectorAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {
        let currType = ctx.get(CTX_CURR_TYPE);
        let currDecor = ctx.get(CTX_CURR_DECOR);
        if (isClass(currType)
            && currDecor
            && ctx.reflects.hasMetadata(RegisterFor, currType)) {
            let meta = lang.first(ctx.reflects.getMetadata<RegisterForMetadata>(RegisterFor, currType));
            if (meta && meta.regFor) {
                switch (meta.regFor) {
                    case 'root':
                        ctx.set(InjectorToken, ctx.getContainer());
                        break;
                    default:
                        let subInj = ctx.getContainer().get(InjectorFactory);
                        subInj.registerValue(ParentInjectorToken, ctx.injector);
                        ctx.set(InjectorToken, subInj);
                        break;
                }
                ctx.injector.register(currType);
            }
        } else {
            next();
        }
    }
}
