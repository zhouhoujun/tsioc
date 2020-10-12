import { DesignContext, isClassType, isDefined } from '@tsdi/ioc';
import { BindingPropMetadata } from '../decorators/BindingPropMetadata';
import { IComponentReflect } from '../IComponentReflect';


/**
 * binding property type action.
 *
 * @export
 */
export const BindingPropTypeAction = function (ctx: DesignContext, next: () => void) {
    let refl = ctx.reflect as IComponentReflect;
    let currDecor = ctx.currDecor;
    let propBindings = refl?.getBindings?.(currDecor);
    if (propBindings) {
        ctx.reflect.defines.extendTypes.forEach(ty => {
            let propMetas = ctx.reflects.getPropertyMetadata<BindingPropMetadata>(currDecor, ty);
            Object.keys(propMetas).forEach(key => {
                if (!propBindings.has(key)) {
                    propBindings.set(key, { name: key, type: null });
                }
                let binding = propBindings.get(key);
                let props = propMetas[key];
                props.forEach(prop => {
                    if (prop.bindingName && !binding.bindingName) {
                        binding.bindingName = prop.bindingName;
                    }

                    if (!binding.type && isClassType(prop.type)) {
                        binding.type = prop.type;
                    }

                    if (!binding.decorator) {
                        binding.decorator = prop.decorator;
                    }

                    if (!binding.direction) {
                        binding.direction = prop.direction;
                    }

                    if (prop.alias) {
                        binding.provider = ctx.injector.getToken(prop.provider || prop.type, prop.alias);
                    }

                    if (prop.bindingType) {
                        binding.bindingType = prop.bindingType;
                    }
                    if (isDefined(prop.defaultValue)) {
                        binding.defaultValue = prop.defaultValue;
                    }
                });
            });
        });
    }
    next();
};
