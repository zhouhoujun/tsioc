import { BindDeignParamTypeAction, RuntimeActionContext, IParameter, getParamMetadata, isArray, ParameterMetadata, lang, MetadataService, isClass, isToken, ClassType, isNullOrUndefined, InjectReference } from '@tsdi/ioc';
import { IBindingTypeReflect, IBinding } from './IPropertyBindingReflect';
import { BindingPropertyMetadata } from '../../decorators';


export class BindInputParamTypeAction extends BindDeignParamTypeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let propertyKey = ctx.propertyKey || 'constructor';

        let target = ctx.target
        let type = ctx.targetType;

        let ref = ctx.targetReflect as IBindingTypeReflect;
        if (!ref.paramsBindings) {
            ref.paramsBindings = new Map();
        }

        let bindParams: IBinding<any>[]
        if (ref.paramsBindings.has(propertyKey)) {
            bindParams = ref.paramsBindings.get(propertyKey);
        } else {
            bindParams = [];
        }

        let designParams: IParameter[] = this.createDesignParams(type, target, propertyKey);


        let parameters = (target || propertyKey !== 'constructor') ? getParamMetadata<BindingPropertyMetadata>(ctx.currDecoractor, target, propertyKey) : getParamMetadata<BindingPropertyMetadata>(ctx.currDecoractor, type);
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

                    let desp = designParams[parm.index];
                    if (!bindParams.some(b => b.name === desp.name)) {
                        bindParams.push({
                            name: desp.name,
                            type: desp.type as ClassType<any>,
                            provider: this.container.getTokenKey(parm.provider, parm.alias),
                            defaultValue: parm.defaultValue
                        });
                    }
                }
            });
        }

        if (propertyKey === 'constructor') {
            if (designParams.some(pa => !pa.type && !pa.provider)) {
                lang.forInClassChain(ctx.targetType, ty => {
                    if (ty === ctx.targetType) {
                        return true;
                    }

                    let parameters = getParamMetadata<BindingPropertyMetadata>(ctx.currDecoractor, ty);
                    if (parameters.length < 1) {
                        return true;
                    }

                    let names = this.container.get(MetadataService).getParamerterNames(ty, propertyKey);
                    if (names.length < 1) {
                        return true;
                    }

                    parameters.forEach((params) => {
                        let parm = (isArray(params) && params.length > 0) ? params[0] : null;
                        let n = names.length > parm.index ? names[parm.index] : '';
                        if (parm && (parm.type || parm.provider || parm.bindingName)) {
                            bindParams.forEach(bp => {
                                if (!bp.type && !bp.provider && bp.name === n) {
                                    if (parm.bindingName) {
                                        bp.bindingName = parm.bindingName;
                                    }
                                    if (parm.provider) {
                                        bp.provider = parm.type;
                                    }
                                    if (parm.type) {
                                        bp.type = parm.type as ClassType<any>;
                                    }
                                    if (!isNullOrUndefined(parm.defaultValue)) {
                                        bp.defaultValue = parm.defaultValue;
                                    }
                                }
                            })
                        }
                    });
                    return false;
                })
            }
        }
        ref.paramsBindings.set(propertyKey, bindParams);
        // reset binding provider
        ref.methodParams.get(propertyKey)
            .forEach(p => {
                bindParams.forEach(b => {
                    if (p.name === b.name) {
                        p.provider = new InjectReference(b.provider || b.type || b.name, '__binding');
                    }
                })
            });

        next();
    }
}
