import { BindPropertyTypeActionData } from './BindPropertyTypeAction';
import { IContainer } from '../../IContainer';
import { CoreActions } from './CoreActions';
import { ActionComposite } from './ActionComposite';
import { InjectReference } from '../../InjectReference';
import { ProviderMap } from '../providers';
import { ObjectMap } from '../../types';


/**
 * inject property action data.
 *
 * @export
 * @interface InjectPropertyActionData
 * @extends {BindPropertyTypeActionData}
 */
export interface InjectPropertyActionData extends BindPropertyTypeActionData {
    injecteds?: ObjectMap<boolean>;
}

/**
 * inject property value action, to inject property value for resolve instance.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class InjectPropertyAction extends ActionComposite {

    constructor() {
        super(CoreActions.injectProperty)
    }

    protected working(container: IContainer, data: InjectPropertyActionData) {
        if (!data.execResult) {
            this.parent.find(act => act.name === CoreActions.bindPropertyType).execute(container, data);
        }

        if (data.target && data.execResult && data.execResult.length) {
            let providerMap = data.providerMap;
            data.injecteds = data.injecteds || {};
            data.execResult.forEach((prop, idx) => {
                if (prop && !data.injecteds[prop.propertyKey]) {
                    let token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    let pdrMap = container.get(new InjectReference(ProviderMap, data.targetType));
                    if (pdrMap && pdrMap.hasRegister(token)) {
                        data.target[prop.propertyKey] = pdrMap.resolve(token, providerMap);
                        data.injecteds[prop.propertyKey] = true;
                    } else if (providerMap && providerMap.hasRegister(token)) {
                        data.target[prop.propertyKey] = providerMap.resolve(token, providerMap);
                        data.injecteds[prop.propertyKey] = true;
                    } else if (container.has(token)) {
                        data.target[prop.propertyKey] = container.resolve(token, providerMap);
                        data.injecteds[prop.propertyKey] = true;
                    }
                }
            });
        }
    }
}

