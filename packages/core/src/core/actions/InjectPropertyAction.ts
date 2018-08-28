import { BindPropertyTypeActionData } from './BindPropertyTypeAction';
import { IContainer, ContainerToken } from '../../IContainer';
import { CoreActions } from './CoreActions';
import { ActionComposite } from './ActionComposite';
import { ProviderMap } from '../providers';


/**
 * inject property action data.
 *
 * @export
 * @interface InjectPropertyActionData
 * @extends {BindPropertyTypeActionData}
 */
export interface InjectPropertyActionData extends BindPropertyTypeActionData {

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
            let providerMap: ProviderMap, prContainer: IContainer;
            if (data.providerMap) {
                providerMap = data.providerMap;
                if (providerMap.has(ContainerToken)) {
                    prContainer = providerMap.resolve(ContainerToken);
                }
            }

            data.execResult.reverse().forEach((prop, idx) => {
                if (prop) {
                    let token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    let val: any;
                    if (providerMap && providerMap.has(token)) {
                        val = providerMap.resolve(token, providerMap);
                    } else if (prContainer && prContainer.has(token)) {
                        val = prContainer.resolve(token, providerMap);
                    } else if (container.has(token)) {
                        val = container.resolve(token, providerMap);
                    }
                    data.target[prop.propertyKey] = val;
                }
            });
        }
    }
}

