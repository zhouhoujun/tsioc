import { IocAction, IocActionContext } from './Action';
import { IIocContainer } from '../IIocContainer';
import { Token } from '../types';
import { isClass } from '../utils';
import { getParamDecorators } from '../factories';

/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export class BindParameterTypeAction extends IocAction {

    constructor() {
        super()
    }

    execute(container: IIocContainer, ctx: IocActionContext) {
        if (ctx.raiseContainer && ctx.raiseContainer !== container) {
            return;
        }
        let target = ctx.target
        let type = ctx.targetType;
        let propertyKey = ctx.propertyKey;
        let designParams: Token<any>[];

        if (target && propertyKey) {
            designParams = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
        } else {
            designParams = Reflect.getMetadata('design:paramtypes', type) || [];
        }

        designParams = designParams.slice(0);
        designParams.forEach(dtype => {
            if (isClass(dtype) && !container.has(dtype)) {
                container.register(dtype);
            }
        });


        let decors =  getParamDecorators(target || type, propertyKey);

        let matchs = lifeScope.getParameterDecorators(target || type, propertyKey, surm => surm.actions.includes(CoreActions.bindParameterType));

        decors.forEach(surm => {
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


        ctx.execResult = designParams;
    }
}
