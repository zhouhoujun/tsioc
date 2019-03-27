import { Token } from '../../types';
import { isClass, isArray, isToken } from '../../utils';
import { getParamMetadata } from '../../factories';
import { MetadataService } from '../../services';
import { ParameterMetadata } from '../../metadatas';
import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IParameter } from '../../IParameter';
import { BindDeignParamTypeAction } from './BindDeignParamTypeAction';

/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export class BindParameterTypeAction extends BindDeignParamTypeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let propertyKey = ctx.propertyKey || 'constructor';

        let target = ctx.target
        let type = ctx.targetType;


        let designParams: IParameter[];

        if (ctx.targetReflect.methodParams.has(propertyKey)) {
            designParams = ctx.targetReflect.methodParams.get(propertyKey);
        } else {
            designParams = this.createDesignParams(type, target, propertyKey);
        }

        let parameters = (target || propertyKey !== 'constructor') ? getParamMetadata<ParameterMetadata>(ctx.currDecoractor, target, propertyKey) : getParamMetadata<ParameterMetadata>(ctx.currDecoractor, type);
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
