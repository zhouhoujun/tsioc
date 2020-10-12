import { DesignContext } from '@tsdi/ioc';
import { VaildatePropertyMetadata } from '../decorators/Vaildate';
import { IComponentReflect } from '../IComponentReflect';
import { RefChild } from '../decorators/RefChild';


export const RegVaildateAction = function (ctx: DesignContext, next: () => void) {
    let ref = ctx.reflect as IComponentReflect;
    let currDecor = ctx.currDecor;
    let propVaildates = ref.getBindings<VaildatePropertyMetadata[]>(RefChild.toString())
    ctx.reflect.defines.extendTypes.forEach(ty => {
        let propMetas = ctx.reflects.getPropertyMetadata<VaildatePropertyMetadata>(currDecor, ty);
        Object.keys(propMetas).forEach(key => {
            propVaildates.set(key, propMetas[key]);
        })
    });
    next();
};
