import { IocDesignAction, DesignActionContext, lang, getOwnPropertyMetadata, isClass, ITypeReflect, Token, Type, ClassType, isClassType } from '@tsdi/ioc';
import { InputPropertyMetadata } from '../../decorators';

export interface IPropertyBinding<T> {
    name: string;
    bindingName?: string;
    type: ClassType<T>;
    provider?: Token<T>
}
export interface IActivityReflect extends ITypeReflect {
    inputBindings: Map<string, IPropertyBinding<any>>;
}

export class BindInputPropertyTypeAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let ref = ctx.targetReflect as IActivityReflect;
        if (ref.inputBindings) {
            return next();
        }
        ref.inputBindings = new Map();
        lang.forInClassChain(ctx.targetType, ty => {
            let propMetas = getOwnPropertyMetadata<InputPropertyMetadata>(ctx.currDecoractor, ty);
            Object.keys(propMetas).forEach(key => {
                if (!ref.inputBindings.has(key)) {
                    ref.inputBindings.set(key, { name: key, type: null });
                }
                let binding = ref.inputBindings.get(key);
                let props = propMetas[key];
                props.forEach(prop => {
                    if (prop.bindingName && !binding.bindingName) {
                        binding.bindingName = prop.bindingName;
                    }
                    if (isClass(prop.provider) && !this.container.has(prop.provider)) {
                        this.container.register(prop.provider);
                    }
                    if (isClass(prop.type) && !this.container.has(prop.type)) {
                        this.container.register(prop.type);
                    }

                    if (!binding.type && isClassType(prop.type)) {
                        binding.type = prop.type;
                    }

                    if (!binding.provider) {
                        binding.provider = this.container.getToken(prop.provider || prop.type, prop.alias);
                    }
                });
            });
        });
        next();
    }
}
