import { BindPropertyTypeActionData } from './BindPropertyTypeAction';
import { IContainer } from '../../IContainer';
import { CoreActions } from './CoreActions';
import { ActionComposite } from './ActionComposite';


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
            let providerMap = data.providerMap;
            data.execResult.reverse().forEach((prop, idx) => {
                if (prop) {
                    let token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    if (providerMap && providerMap.has(token)) {
                        data.target[prop.propertyKey] = providerMap.resolve(token, providerMap);
                    } else if (container.has(token)) {
                        data.target[prop.propertyKey] = container.resolve(token, providerMap);
                    }
                }
            });
        }
    }
}

