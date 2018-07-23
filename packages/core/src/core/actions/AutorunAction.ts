import { ActionData } from '../ActionData';
import { AutorunMetadata } from '../metadatas';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { isFunction } from '../../utils';
import { CoreActions } from './CoreActions';
import { hasClassMetadata, getTypeMetadata } from '../factories';
import { Autorun, IocExt } from '../decorators';




/**
 * auto run action data.
 *
 * @export
 * @interface AutorunActionData
 * @extends {ActionData<AutorunMetadata>}
 */
export interface AutorunActionData extends ActionData<AutorunMetadata> {

}

/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class AutorunAction extends ActionComposite {

    constructor() {
        super(CoreActions.autorun)
    }

    protected getDecorator(): Function[] {
        return [IocExt, Autorun];
    }

    protected working(container: IContainer, data: AutorunActionData) {
        if (data.tokenKey && data.targetType) {
            let decorators = this.getDecorator();
            decorators.forEach(decorator => {
                if (hasClassMetadata(decorator, data.targetType)) {
                    let metas = getTypeMetadata<AutorunMetadata>(decorator, data.targetType);
                    let meta = metas.find(it => !!it.autorun);
                    if (!meta && metas.length) {
                        meta = metas[0]
                    }
                    if (meta) {
                        let instance = container.get(data.tokenKey);
                        if (instance && meta.autorun && isFunction(instance[meta.autorun])) {
                            container.syncInvoke(data.tokenKey, meta.autorun, instance);
                        }
                    }
                }
            });

        }
    }
}

