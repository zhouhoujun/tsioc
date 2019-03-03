import { IocAction, IocActionContext } from './Action';
import { IIocContainer } from '../IIocContainer';
import { Token } from '../types';
import { isClass, isArray, lang } from '../utils';
import { getParamMetadata, getOwnParamMetadata } from '../factories';
import { DecoratorRegisterer, RuntimeLifeScope } from '../services';
import { ParameterMetadata } from '../metadatas';

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
        super.execute(container, ctx);
        
        let propertyKey = ctx.propertyKey || 'constructor';
        if(ctx.targetReflect.methodParams && ctx.targetReflect.methodParams[propertyKey]) {
            return;
        }
        ctx.targetReflect.methodParams = ctx.targetReflect.methodParams || {};
        let target = ctx.target
        let type = ctx.targetType;
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

        let decors = container.resolve(DecoratorRegisterer).getParameterDecorators(target || type, propertyKey, lang.getClass(this));

        decors.forEach(d => {
            let parameters = (target || propertyKey !== 'constructor') ? getParamMetadata<ParameterMetadata>(d, target, propertyKey) : getOwnParamMetadata<ParameterMetadata>(d, type);
            if (isArray(parameters) && parameters.length) {
                parameters.forEach(params => {
                    let parm = (isArray(params) && params.length > 0) ? params[0] : null;
                    if (parm && parm.index >= 0) {
                        if (isClass(parm.type)) {
                            if (!container.has(parm.type)) {
                                container.register(parm.type);
                            }
                            if (parm.provider && !container.has(parm.provider, parm.alias)) {
                                container.register(container.getToken(parm.provider, parm.alias), parm.type);
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

        let names = container.resolve(RuntimeLifeScope).getParamerterNames(type, propertyKey);
        ctx.targetReflect.methodParams[propertyKey] = designParams.map((typ, idx) => {
            return {
                type: typ,
                name: names[idx]
            }
        });
    }
}
