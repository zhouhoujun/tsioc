import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { isToken } from '../../utils/isToken';


/**
 * inject property value action, to inject property value for resolve instance.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class InjectPropertyAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let providers = ctx.providers;
        let injector = ctx.injector;

        let props = ctx.targetReflect.propProviders;

        props.forEach((token, propertyKey) => {
            let key = `${propertyKey}_INJECTED`
            if (isToken(token) && !ctx.has(key)) {
                ctx.target[propertyKey] = injector.resolve({ token, target: ctx.type }, providers);
                ctx.set(key, true);
            }
        });

        next();
    }
}
