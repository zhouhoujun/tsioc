import { IocAction, IocActionContext } from './Action';
import { IIocContainer } from '../IIocContainer';
import { DecoratorRegisterer } from '../services';
import { lang, isClass } from '../utils';
import { PropertyMetadata } from '../metadatas';
import { getPropertyMetadata } from '../factories';

/**
 * bind property type action. to get the property autowride token of Type calss.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class BindPropertyTypeAction extends IocAction {

    constructor() {
        super()
    }

    execute(container: IIocContainer, ctx: IocActionContext) {
        if (ctx.raiseContainer && ctx.raiseContainer !== container) {
            return;
        }
        super.execute(container, ctx);
        let type = ctx.targetType;

        if(ctx.targetReflect.props){
            return;
        }

        let matchs = container.resolve(DecoratorRegisterer).getPropertyDecorators(type, lang.getClass(this));
        let list: PropertyMetadata[] = [];
        matchs.forEach(d => {
            let propMetadata = getPropertyMetadata<PropertyMetadata>(d, type);

            for (let n in propMetadata) {
                list = list.concat(propMetadata[n]);
            }
            list = list.filter(n => !!n);
            list.forEach(prop => {
                if (isClass(prop.type)) {
                    if (!container.has(prop.type)) {
                        container.register(prop.type);
                    }
                    if (prop.provider && !container.has(prop.provider, prop.alias)) {
                        container.register(container.getToken(prop.provider, prop.alias), prop.type);
                    }
                }
            });
        });

        ctx.targetReflect.props = list;
    }
}
