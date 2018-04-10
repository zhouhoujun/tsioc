import { ActionData } from '../ActionData';
import { AutorunMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { isFunction } from '../../utils/index';
import { CoreActions } from './CoreActions';
import { hasClassMetadata, hasMethodMetadata, getTypeMetadata, getMethodMetadata } from '../factories/index';
import { Autorun, IocModule } from '../decorators/index';





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
        return [IocModule, Autorun];
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
                            container.invoke(data.tokenKey, meta.autorun, instance);
                        }
                    }
                } else if (hasMethodMetadata(decorator, data.targetType)) {
                    let metas = getMethodMetadata<AutorunMetadata>(decorator, data.targetType);
                    let meta: AutorunMetadata;
                    Object.keys(metas).forEach(n => {
                        let mm = metas[n];
                        if (mm && !meta) {
                            meta = mm.find(it => !!it.autorun);
                        }
                    });

                    if (meta && meta.autorun) {
                        container.invoke(data.tokenKey, meta.autorun);
                    }
                }
            });

        }
    }
}

