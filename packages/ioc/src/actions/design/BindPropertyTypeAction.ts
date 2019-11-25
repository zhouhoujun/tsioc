import { isClass } from '../../utils';
import { IocDesignAction } from './IocDesignAction';
import { DesignActionContext } from './DesignActionContext';
import { PropertyMetadata } from '../../metadatas';
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
        ctx.targetReflect.defines.extendTypes.forEach(ty => {
            let propMetas = refs.getPropertyMetadata<PropertyMetadata>(ctx.get(CTX_CURR_DECOR), ty);
            Object.keys(propMetas).forEach(key => {
                let props = propMetas[key];
                props.forEach(prop => {
                    if (isClass(prop.provider) && !this.container.has(prop.provider)) {
                        this.container.register(prop.provider);
                    }
                    if (isClass(prop.type) && !this.container.has(prop.type)) {
                        this.container.register(prop.type);
                    }

                    if (!ctx.targetReflect.propProviders.has(key)) {
                        ctx.targetReflect.propProviders.set(key, this.container.getToken(prop.provider || prop.type, prop.alias));
                    }
                });
            });
        });
        next();
    }
}
