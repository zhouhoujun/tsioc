import { DesignContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { VaildatePropertyMetadata } from '../decorators/Vaildate';
import { IComponentReflect } from '../IComponentReflect';
import { RefChild } from '../decorators/RefChild';


export const RegVaildateAction = function (ctx: DesignContext, next: () => void) {
    let ref = ctx.targetReflect as IComponentReflect;
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
    let propVaildates = ref.getBindings<VaildatePropertyMetadata[]>(RefChild.toString())
    ctx.targetReflect.defines.extendTypes.forEach(ty => {
        let propMetas = ctx.reflects.getPropertyMetadata<VaildatePropertyMetadata>(currDecor, ty);
        Object.keys(propMetas).forEach(key => {
            propVaildates.set(key, propMetas[key]);
        })
    });

};
