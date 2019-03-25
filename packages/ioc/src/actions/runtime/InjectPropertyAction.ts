import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { InjectReference } from '../../InjectReference';
import { ProviderMap } from '../../providers';
import { IocContainer } from '../../IocContainer';
import { lang } from '../../utils';


/**
 * inject property value action, to inject property value for resolve instance.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class InjectPropertyAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let providerMap = ctx.providerMap;
        ctx.injecteds = ctx.injecteds || {};
        let container = this.container;

        let props = ctx.targetReflect.props.get(ctx.currDecoractor);

        props.forEach((prop, propertyKey) => {
            if (prop && !ctx.injecteds[propertyKey]) {
                let token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                let pdrMap = container.get(new InjectReference(ProviderMap, ctx.targetType));
                if (lang.isExtendsClass(IocContainer, container.getTokenProvider(token))) {
                    Object.defineProperty(ctx.target, propertyKey, { enumerable: false, writable: true });
                }
                if (pdrMap && pdrMap.has(token)) {
                    ctx.target[propertyKey] = pdrMap.resolve(token, providerMap);
                    ctx.injecteds[propertyKey] = true;
                } else if (providerMap && providerMap.has(token)) {
                    ctx.target[propertyKey] = providerMap.resolve(token, providerMap);
                    ctx.injecteds[propertyKey] = true;
                } else if (container.has(token)) {
                    ctx.target[propertyKey] = container.resolve(token, providerMap);
                    ctx.injecteds[propertyKey] = true;
                }
            }
        });

        next();
    }
}
