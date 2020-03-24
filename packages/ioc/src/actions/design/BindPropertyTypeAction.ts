import { isClass } from '../../utils/lang';
import { DesignContext } from './DesignActionContext';
import { PropertyMetadata } from '../../metadatas/PropertyMetadata';
import { CTX_CURR_DECOR } from '../../context-tokens';

/**
 * bind property type action. to get the property autowride token of Type calss.
 *
 * @export
 */
export const BindPropTypeAction = function (ctx: DesignContext, next: () => void) {
    let refs = ctx.reflects;
    let injector = ctx.injector;
    let targetReflect = ctx.targetReflect;
    targetReflect.defines.extendTypes.forEach(ty => {
        let propMetas = refs.getPropertyMetadata<PropertyMetadata>(ctx.getValue(CTX_CURR_DECOR), ty);
        Object.keys(propMetas).forEach(key => {
            let props = propMetas[key];
            props.forEach(prop => {
                if (isClass(prop.provider) && !injector.hasRegister(prop.provider)) {
                    injector.registerType(prop.provider);
                }
                if (isClass(prop.type) && !injector.hasRegister(prop.type)) {
                    injector.registerType(prop.type);
                }

                if (!targetReflect.propProviders.has(key)) {
                    targetReflect.propProviders.set(key, injector.getToken(prop.provider || prop.type, prop.alias));
                }
            });
        });
    });
    next();
};

