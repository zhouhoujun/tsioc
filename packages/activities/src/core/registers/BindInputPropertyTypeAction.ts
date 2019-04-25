import { IocDesignAction, DesignActionContext, lang, getOwnPropertyMetadata, PropertyMetadata, isClass, ITypeReflect, Token } from '@tsdi/ioc';

export interface IActivityReflect extends ITypeReflect {
    inputs: Map<string, Token<any>>;
}

export class BindInputPropertyTypeAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let ref = ctx.targetReflect as IActivityReflect;
        if (ref.inputs) {
            return next();
        }
        ref.inputs = new Map();
        lang.forInClassChain(ctx.targetType, ty => {
            let propMetas = getOwnPropertyMetadata<PropertyMetadata>(ctx.currDecoractor, ty);
            Object.keys(propMetas).forEach(key => {
                let props = propMetas[key];
                props.forEach(prop => {
                    if (isClass(prop.provider) && !this.container.has(prop.provider)) {
                        this.container.register(prop.provider);
                    }
                    if (isClass(prop.type) && !this.container.has(prop.type)) {
                        this.container.register(prop.type);
                    }

                    if (!ref.inputs.has(key)) {
                        ref.inputs.set(key, this.container.getToken(prop.provider || prop.type, prop.alias));
                    }
                });
            });
        });
        next();
    }
}
