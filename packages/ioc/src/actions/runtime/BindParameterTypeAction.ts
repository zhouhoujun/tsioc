import { Token } from '../../types';
import { isClass, isArray, isToken } from '../../utils';
import { getParamMetadata, getOwnParamMetadata } from '../../factories';
import { MetadataService } from '../../services';
import { ParameterMetadata } from '../../metadatas';
import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IParameter } from '../../IParameter';

/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export class BindParameterTypeAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let propertyKey = ctx.propertyKey || 'constructor';


        let target = ctx.target
        let type = ctx.targetType;


        let designParams: IParameter[];

        if (ctx.targetReflect.methodParams.has(propertyKey)) {
            designParams = ctx.targetReflect.methodParams.get(propertyKey);
        } else {
            let paramTokens: Token<any>[];
            if (target && propertyKey) {
                paramTokens = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
            } else {
                paramTokens = Reflect.getMetadata('design:paramtypes', type) || [];
            }

            paramTokens = paramTokens.slice(0);
            paramTokens.forEach(dtype => {
                if (isClass(dtype) && !this.container.has(dtype)) {
                    this.container.register(dtype);
                }
            });

            let names = this.container.resolve(MetadataService).getParamerterNames(type, propertyKey);
            designParams = names.map((n, idx) => {
                return <IParameter>{
                    name: n,
                    type: paramTokens[idx]
                }
            })
        }

        let parameters = (target || propertyKey !== 'constructor') ? getParamMetadata<ParameterMetadata>(ctx.currDecoractor, target, propertyKey) : getOwnParamMetadata<ParameterMetadata>(ctx.currDecoractor, type);
        if (isArray(parameters) && parameters.length) {
            parameters.forEach(params => {
                let parm = (isArray(params) && params.length > 0) ? params[0] : null;
                if (parm && parm.index >= 0) {
                    if (isClass(parm.provider)) {
                        if (!this.container.has(parm.provider)) {
                            this.container.register(parm.provider);
                        }
                    }
                    if (isClass(parm.type)) {
                        if (!this.container.has(parm.type)) {
                            this.container.register(parm.type);
                        }
                    }
                    if (isToken(parm.provider)) {
                        designParams[parm.index].provider = this.container.getTokenKey(parm.provider, parm.alias);
                    }
                }
            });
        }

        ctx.targetReflect.methodParams.set(propertyKey, designParams);

        next();
    }
}
