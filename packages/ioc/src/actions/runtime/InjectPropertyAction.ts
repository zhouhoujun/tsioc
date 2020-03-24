import { RuntimeContext } from './RuntimeActionContext';
import { isToken } from '../../utils/isToken';
import { isDefined } from '../../utils/lang';


/**
 * inject property value action, to inject property value for resolve instance.
 */
export const InjectPropAction = function (ctx: RuntimeContext, next: () => void) {
    let providers = ctx.providers;
    let injector = ctx.injector;

    let props = ctx.targetReflect.propProviders;

    props.forEach((token, propertyKey) => {
        let key = `${propertyKey}_INJECTED`
        if (isToken(token) && !ctx.hasValue(key)) {
            let val = injector.resolve({ token, target: ctx.type }, providers);
            if (isDefined(val)) {
                ctx.target[propertyKey] = val;
                ctx.set(key, true);
            }
        }
    });

    next();
};
