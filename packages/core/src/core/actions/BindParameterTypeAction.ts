import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { getParamMetadata, getOwnParamMetadata, hasParamMetadata, hasOwnParamMetadata } from '../factories';
import { ParameterMetadata } from '../metadatas';
import { IContainer } from '../../IContainer';
import { Token } from '../../types';
import { isArray } from '../../utils';

/**
 * bind parameter type action data.
 *
 * @export
 * @interface BindParameterTypeActionData
 * @extends {ActionData<Token<any>[]>}
 */
export interface BindParameterTypeActionData extends ActionData<Token<any>[]> {
}

/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export class BindParameterTypeAction extends ActionComposite {

    constructor() {
        super(CoreActions.bindParameterType)
    }

    protected working(container: IContainer, data: ActionData<Token<any>[]>) {

        let target = data.target
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();
        let designParams: Token<any>[];

        if (target && propertyKey) {
            designParams = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
        } else {
            designParams = Reflect.getMetadata('design:paramtypes', type) || [];
        }

        designParams = designParams.slice(0);
        designParams.forEach(dtype => {
            if (lifeScope.isVaildDependence(dtype)) {
                if (!container.has(dtype)) {
                    container.register(dtype);
                }
            }
        });


        let matchs = lifeScope.getParameterDecorators((surm => {
            return surm.actions.includes(CoreActions.bindParameterType) && ((target || propertyKey !== 'constructor') ? hasParamMetadata(surm.name, target, propertyKey)
                : hasOwnParamMetadata(surm.name, type));
        }));

        matchs.forEach(surm => {
            let parameters = (target || propertyKey !== 'constructor') ? getParamMetadata<ParameterMetadata>(surm.name, target, propertyKey) : getOwnParamMetadata<ParameterMetadata>(surm.name, type);
            if (isArray(parameters) && parameters.length) {
                parameters.forEach(params => {
                    let parm = (isArray(params) && params.length > 0) ? params[0] : null;
                    if (parm && parm.index >= 0) {
                        if (lifeScope.isVaildDependence(parm.provider)) {
                            if (!container.has(parm.provider, parm.alias)) {
                                container.register(container.getToken(parm.provider, parm.alias));
                            }
                        }
                        if (lifeScope.isVaildDependence(parm.type)) {
                            if (!container.has(parm.type)) {
                                container.register(parm.type);
                            }
                        }
                        let token = parm.provider ? container.getTokenKey(parm.provider, parm.alias) : parm.type;
                        if (token) {
                            designParams[parm.index] = token;
                        }
                    }
                });
            }
        });


        data.execResult = designParams;
    }
}

