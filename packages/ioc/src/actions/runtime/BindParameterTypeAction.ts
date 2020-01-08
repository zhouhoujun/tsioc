import { isClass, isArray } from '../../utils/lang';
import { isToken } from '../../utils/isToken';
import { ParameterMetadata } from '../../metadatas/ParameterMetadata';
import { RuntimeActionContext } from './RuntimeActionContext';
import { CTX_CURR_DECOR } from '../../context-tokens';
import { createDesignParams } from './createDesignParams';

/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export const BindParameterTypeAction = function (ctx: RuntimeActionContext, next: () => void) {
    let propertyKey = ctx.propertyKey;

    if (ctx.targetReflect.methodParams.has(propertyKey)) {
        return next();
    }

    let target = ctx.target
    let type = ctx.type;

    let designParams = createDesignParams(ctx, type, target, propertyKey);

    let refs = ctx.reflects;
    let injector = ctx.injector;
    let currDecoractor = ctx.get(CTX_CURR_DECOR);
    let parameters = (target || propertyKey !== 'constructor') ? refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, target, propertyKey) : refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, type);
    if (isArray(parameters) && parameters.length) {
        parameters.forEach(params => {
            let parm = (isArray(params) && params.length > 0) ? params[0] : null;
            if (parm && parm.index >= 0) {
                if (isClass(parm.provider)) {
                    if (!injector.hasRegister(parm.provider)) {
                        injector.registerType(parm.provider);
                    }
                }
                if (isClass(parm.type)) {
                    if (!injector.hasRegister(parm.type)) {
                        injector.registerType(parm.type);
                    }
                }
                if (isToken(parm.provider)) {
                    designParams[parm.index].provider = injector.getTokenKey(parm.provider, parm.alias);
                }
            }
        });
    }

    if (propertyKey === 'constructor') {
        if (designParams.some(pa => !pa.type && !pa.provider)) {
            ctx.targetReflect.defines.extendTypes.forEach(ty => {
                if (ty === ctx.type) {
                    return true;
                }

                let parameters = refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, ty);
                if (parameters.length < 1) {
                    return true;
                }

                let names = refs.getParamerterNames(ty, propertyKey);
                if (names.length < 1) {
                    return true;
                }

                parameters.map((params, idx) => {
                    let parm = (isArray(params) && params.length > 0) ? params[0] : null;
                    let n = (parm && names.length > parm.index) ? names[parm.index] : names[idx] || '';
                    if (!parm) {
                        return { name: n };
                    }
                    return {
                        name: n,
                        provider: injector.getTokenKey(parm.provider, parm.alias)
                    }
                }).forEach(parm => {
                    if (parm.provider) {
                        designParams.forEach(pa => {
                            if (!pa.type && !pa.provider && pa.name === parm.name) {
                                pa.provider = parm.provider;
                            }
                        });
                    }
                });
                return false;
            });
        }
    }

    ctx.targetReflect.methodParams.set(propertyKey, designParams);

    next();
};

