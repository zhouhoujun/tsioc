import { Token } from '../types';
import { isClass, isArray, lang } from '../utils';
import { getParamMetadata, getOwnParamMetadata } from '../factories';
import { DecoratorRegisterer, RuntimeLifeScope } from '../services';
import { ParameterMetadata } from '../metadatas';
import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';

/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export class BindParameterTypeAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void) {
        let propertyKey = ctx.propertyKey || 'constructor';
        if (ctx.targetReflect.methodParams && ctx.targetReflect.methodParams[propertyKey]) {
            return next();
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
            if (isClass(dtype) && !this.container.has(dtype)) {
                this.container.register(dtype);
            }
        });

        let decors = this.container.resolve(DecoratorRegisterer).getParameterDecorators(target || type, propertyKey, lang.getClass(this));

        decors.forEach(d => {
            let parameters = (target || propertyKey !== 'constructor') ? getParamMetadata<ParameterMetadata>(d, target, propertyKey) : getOwnParamMetadata<ParameterMetadata>(d, type);
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
                            if (parm.alias && !this.container.has(parm.provider, parm.alias)) {
                                this.container.bindProvider(this.container.getToken(parm.provider, parm.alias), parm.type);
                            }
                        }

                        let token = parm.provider ? this.container.getTokenKey(parm.provider, parm.alias) : parm.type;
                        if (token) {
                            designParams[parm.index] = token;
                        }
                    }
                });
            }
        });

        let names = this.container.resolve(RuntimeLifeScope).getParamerterNames(type, propertyKey);
        ctx.targetReflect.methodParams[propertyKey] = designParams.map((typ, idx) => {
            return {
                type: typ,
                name: names[idx]
            }
        });

        next();
    }
}
