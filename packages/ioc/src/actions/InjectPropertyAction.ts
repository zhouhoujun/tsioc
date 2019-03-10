import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { IIocContainer } from '../IIocContainer';
import { InjectReference } from '../InjectReference';
import { ProviderMap } from '../providers';
import { IocContainer } from '../IocContainer';
import { lang } from '../utils';

/**
 * inject property value action, to inject property value for resolve instance.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class InjectPropertyAction extends IocRegisterAction {

    constructor(container: IIocContainer) {
        super(container)
    }

    execute(ctx: RegisterActionContext, next: () => void) {
        let providerMap = ctx.providerMap;
        ctx.injecteds = ctx.injecteds || {};
        ctx.targetReflect.props.forEach((prop, idx) => {
            if (prop && !ctx.injecteds[prop.propertyKey]) {
                let token = prop.provider ? this.container.getToken(prop.provider, prop.alias) : prop.type;
                let pdrMap = this.container.get(new InjectReference(ProviderMap, ctx.targetType));
                if (lang.isExtendsClass(IocContainer, this.container.getTokenProvider(token))) {
                    Object.defineProperty(ctx.target, prop.propertyKey, { enumerable: false, writable: true });
                }
                if (pdrMap && pdrMap.has(token)) {
                    ctx.target[prop.propertyKey] = pdrMap.resolve(token, providerMap);
                    ctx.injecteds[prop.propertyKey] = true;
                } else if (providerMap && providerMap.has(token)) {
                    ctx.target[prop.propertyKey] = providerMap.resolve(token, providerMap);
                    ctx.injecteds[prop.propertyKey] = true;
                } else if (this.container.has(token)) {
                    ctx.target[prop.propertyKey] = this.container.resolve(token, providerMap);
                    ctx.injecteds[prop.propertyKey] = true;
                }
            }
        });

        next();
    }
}
