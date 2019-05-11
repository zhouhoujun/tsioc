import { IocDesignAction, DesignActionContext, lang, getOwnPropertyMetadata, isClassType, isUndefined } from '@tsdi/ioc';
import { BindingPropertyMetadata } from '../decorators';
import { IBindingTypeReflect } from './IPropertyBindingReflect';


export class BindingPropertyTypeAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let ref = ctx.targetReflect as IBindingTypeReflect;
        if (!ref.propBindings) {
            ref.propBindings = new Map();
            ref.paramsBindings = new Map();
        }

        lang.forInClassChain(ctx.targetType, ty => {
            let propMetas = getOwnPropertyMetadata<BindingPropertyMetadata>(ctx.currDecoractor, ty);
            Object.keys(propMetas).forEach(key => {
                if (!ref.propBindings.has(key)) {
                    ref.propBindings.set(key, { name: key, type: null });
                }
                let binding = ref.propBindings.get(key);
                let props = propMetas[key];
                props.forEach(prop => {
                    if (prop.bindingName && !binding.bindingName) {
                        binding.bindingName = prop.bindingName;
                    }
                    // if (isClass(prop.provider) && !this.container.has(prop.provider)) {
                    //     this.container.register(prop.provider);
                    // }
                    // if (isClass(prop.type) && !this.container.has(prop.type)) {
                    //     this.container.register(prop.type);
                    // }

                    if (!binding.type && isClassType(prop.type)) {
                        binding.type = prop.type;
                    }

                    if (!binding.provider) {
                        binding.provider = this.container.getToken(prop.provider || prop.type, prop.alias);
                    }
                    if (!isUndefined(prop.defaultValue)) {
                        binding.defaultValue = prop.defaultValue;
                    }
                });
            });
        });
        next();
    }
}
