import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType, getParamMetadata } from '../factories/index';
import { ParameterMetadata } from '../metadatas/index';
import { IContainer } from '../../IContainer';
import { Type } from '../../Type';
import { Token } from '../../types';
import { isArray } from '../../utils/index';


export interface BindParameterTypeActionData extends ActionData<Token<any>[]> {
}

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
            return surm.actions.includes(CoreActions.bindParameterType) && (target ? Reflect.hasMetadata(surm.name, target, propertyKey)
                : Reflect.hasMetadata(surm.name, type));
        }));

        matchs.forEach(surm => {
            let parameters = target ? getParamMetadata(surm.name, target, propertyKey) : Reflect.getMetadata(surm.name, type);
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

