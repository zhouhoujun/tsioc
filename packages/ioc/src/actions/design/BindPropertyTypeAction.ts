import { isClass } from '../../utils/lang';
import { IocDesignAction } from './IocDesignAction';
import { DesignActionContext } from './DesignActionContext';
import { PropertyMetadata } from '../../metadatas/PropertyMetadata';
import { CTX_CURR_DECOR } from '../../context-tokens';

/**
 * bind property type action. to get the property autowride token of Type calss.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class BindPropertyTypeAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let refs = ctx.reflects;
        let injector = ctx.injector;
        ctx.targetReflect.defines.extendTypes.forEach(ty => {
            let propMetas = refs.getPropertyMetadata<PropertyMetadata>(ctx.get(CTX_CURR_DECOR), ty);
            Object.keys(propMetas).forEach(key => {
                let props = propMetas[key];
                props.forEach(prop => {
                    if (isClass(prop.provider) && !injector.has(prop.provider)) {
                        injector.register(prop.provider);
                    }
                    if (isClass(prop.type) && !injector.has(prop.type)) {
                        injector.register(prop.type);
                    }

                    if (!ctx.targetReflect.propProviders.has(key)) {
                        ctx.targetReflect.propProviders.set(key, injector.getToken(prop.provider || prop.type, prop.alias));
                    }
                });
            });
        });
        next();
    }
}
