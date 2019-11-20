import { IocDesignAction, DesignActionContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { VaildatePropertyMetadata } from '../decorators';
import { IBindingTypeReflect } from '../bindings';


export class RegisterVaildateAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let ref = ctx.targetReflect as IBindingTypeReflect;
        let currDecor = ctx.getContext(CTX_CURR_DECOR);
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
