import { DecorDefine, ParameterMetadata, PropertyMetadata, TypeReflect } from './metadatas';
import { reflects } from './reflects';


export interface DecorContext extends DecorDefine {
    reflect: TypeReflect;
}


export const InjectParamDecorAction = (ctx: DecorContext, next: () => void) => {
    if (reflects.isDecorActionType(ctx.decor, 'inject')) {
        const reflect = ctx.reflect;
        const meta = ctx.matedata as ParameterMetadata;
        const name = reflect.class.getParamName(ctx.propertyKey, ctx.parameterIndex);
        if (!reflect.methodParams.has(ctx.propertyKey)) {
            reflect.methodParams.set(ctx.propertyKey, []);
        }
        const params = reflect.methodParams.get(ctx.propertyKey);
        let type = Reflect.getOwnMetadata('design:type', reflect.class.type, ctx.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', reflect.class.type.constructor, ctx.propertyKey);
        }
        meta.type = type;
        params.push(meta);
    } else {
        return next();
    }
};

export const InjectPropDecorAction = (ctx: DecorContext, next: () => void) => {
    if (reflects.isDecorActionType(ctx.decor, 'inject')) {
        const reflect = ctx.reflect;
        const meta = ctx.matedata as PropertyMetadata;
        if (!reflect.propProviders.has(ctx.propertyKey)) {
            reflect.propProviders.set(ctx.propertyKey, []);
        }
        const pdrs = reflect.propProviders.get(ctx.propertyKey);
        let type = Reflect.getOwnMetadata('design:type', reflect.class.type, ctx.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', reflect.class.type.constructor, ctx.propertyKey);
        }
        meta.type = type;
        pdrs.push(meta);
    } else {
        return next();
    }
};

