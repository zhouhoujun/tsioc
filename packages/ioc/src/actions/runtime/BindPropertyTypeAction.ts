import { isClass } from '../../utils';
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

        let props = ctx.targetReflect.props.get(ctx.currDecoractor);

        props.forEach(prop => {
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
                this.container.register(this.container.getToken(prop.type, prop.alias), prop.provider);
            }
        });

        next();
    }
}
