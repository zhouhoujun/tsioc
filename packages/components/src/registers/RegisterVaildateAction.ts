import { IocDesignAction, DesignActionContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { VaildatePropertyMetadata } from '../decorators/Vaildate';
import { IComponentReflect } from '../bindings/IComponentReflect';


export class RegisterVaildateAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let ref = ctx.targetReflect as IComponentReflect;
        let currDecor = ctx.get(CTX_CURR_DECOR);
        if (!ref.propVaildates) {
            ref.propVaildates = new Map();
        }
        ctx.targetReflect.defines.extendTypes.forEach(ty => {
            let propMetas = ctx.reflects.getPropertyMetadata<VaildatePropertyMetadata>(currDecor, ty);
            Object.keys(propMetas).forEach(key => {
                ref.propVaildates.set(key, propMetas[key]);
            })
        });

    }
}
