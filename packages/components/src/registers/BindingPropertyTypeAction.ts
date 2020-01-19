import { DesignActionContext, isClassType, DecoratorProvider, isDefined, CTX_CURR_DECOR } from '@tsdi/ioc';
import { BindingPropertyMetadata } from '../decorators/BindingPropertyMetadata';
import { IComponentReflect } from '../IComponentReflect';
import { BindingCache } from './BindingCache';


/**
 * binding property type action.
 *
 * @export
 */
export const BindingPropertyTypeAction = function (ctx: DesignActionContext, next: () => void) {
    let ref = ctx.targetReflect as IComponentReflect;
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
    let propBindings = ctx.reflects.getActionInjector().getInstance(DecoratorProvider)
        .resolve(currDecor, BindingCache)
        .getCache(ref);

    if (propBindings) {
        ctx.targetReflect.defines.extendTypes.forEach(ty => {
            let propMetas = ctx.reflects.getPropertyMetadata<BindingPropertyMetadata>(currDecor, ty);
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

                    if (!binding.provider) {
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
