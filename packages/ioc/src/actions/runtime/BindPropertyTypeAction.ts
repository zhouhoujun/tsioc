import { DecoratorRegisterer } from '../../services';
import { lang, isClass } from '../../utils';
import { PropertyMetadata } from '../../metadatas';
import { getPropertyMetadata } from '../../factories';
import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';

/**
 * bind property type action. to get the property autowride token of Type calss.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class BindPropertyTypeAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let type = ctx.targetType;

        if (ctx.targetReflect.props) {
            return next();
        }

        let matchs = ctx.resolve(DecoratorRegisterer).getPropertyDecorators(type, lang.getClass(this));
        let list: PropertyMetadata[] = [];
        matchs.forEach(d => {
            let propMetadata = getPropertyMetadata<PropertyMetadata>(d, type);

            for (let n in propMetadata) {
                list = list.concat(propMetadata[n]);
            }
            list = list.filter(n => !!n);
            list.forEach(prop => {
                if (isClass(prop.provider)) {
                    if (!this.container.has(prop.provider)) {
                        this.container.register(prop.provider);
                    }
                }
                if (isClass(prop.type)) {
                    if (!this.container.has(prop.type)) {
                        this.container.register(prop.type);
                    }
                }

                if (prop.provider && prop.type && prop.alias && !this.container.has(prop.type, prop.alias)) {
                    this.container.register(this.container.getToken(prop.type, prop.alias),  prop.provider);
                }
            });
        });

        ctx.targetReflect.props = list;
        next();
    }
}
