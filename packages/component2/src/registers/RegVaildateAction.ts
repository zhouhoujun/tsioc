import { DesignContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { VaildateMetadata } from '../decorators/Vaildate';
import { IComponentReflect } from '../IComponentReflect';
import { RefChild } from '../decorators/RefChild';


export const RegVaildateAction = function (ctx: DesignContext, next: () => void) {
    let ref = ctx.targetReflect as IComponentReflect;
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
    let propVaildates = ref.getBindings<VaildateMetadata[]>(RefChild.toString())
    ctx.targetReflect.defines.extendTypes.forEach(ty => {
        let propMetas = ctx.reflects.getPropertyMetadata<VaildateMetadata>(currDecor, ty);
        Object.keys(propMetas).forEach(key => {
            propVaildates.set(key, propMetas[key]);
        })
    });
    next();
};
