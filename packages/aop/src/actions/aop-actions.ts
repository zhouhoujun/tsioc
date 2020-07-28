import {
    RuntimeContext, lang, isClass, Type, isBaseType, DesignContext,
    ITypeReflects, ActionInjectorToken, CTX_PARAMS, CTX_ARGS
} from '@tsdi/ioc';
import { AdvisorToken } from '../IAdvisor';
import { ProceedingScope } from '../proceeding/ProceedingScope';
import { NonePointcut } from '../decorators';
import { Advicer } from '../advices/Advicer';
import { Advices } from '../advices/Advices';
import { AdviceMatcherToken } from '../IAdviceMatcher';


/**
 * execute bind method pointcut action.
 */
export const BindMthPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    let reflects = ctx.reflects;
    if (!ctx.target || !isValAspectTag(ctx.type, reflects)) {
        return next();
    }

    let scope = reflects.getActionInjector().getInstance(ProceedingScope);

    let target = ctx.target;
    let targetType = ctx.type;

    let className = lang.getClassName(targetType);
    let decorators = ctx.targetReflect.defines.getPropertyDescriptors();
    let advisor = reflects.getActionInjector().getInstance(AdvisorToken);
    let advicesMap = advisor.getAdviceMap(targetType);

    if (advicesMap && advicesMap.size) {
        advicesMap.forEach((advices, name) => {
            if (name === 'constructor') {
                return;
            }
            let pointcut = {
                name: name,
                fullName: `${className}.${name}`,
                descriptor: decorators[name]
            }
            scope.proceed(target, targetType, advices, pointcut)
        });
    }

    next();
};


/**
 * before constructor advice actions.
 *
 * @export
 */
export const BeforeCtorAdviceAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    let reflects = ctx.reflects;
    if (!isValAspectTag(ctx.type, reflects)) {
        return next();
    }

    reflects.getActionInjector().getInstance(ActionInjectorToken)
        .getInstance(ProceedingScope)
        .beforeConstr(ctx.type, ctx.getValue(CTX_PARAMS), ctx.getValue(CTX_ARGS), ctx.providers);

    next();

};


/**
 * after constructor advice actions.
 *
 * @export
 */
export const AfterCtorAdviceAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    let reflects = ctx.reflects;
    if (!ctx.target || !isValAspectTag(ctx.type, reflects)) {
        return next();
    }

    reflects.getActionInjector().getInstance(ActionInjectorToken)
        .getInstance(ProceedingScope)
        .afterConstr(ctx.target, ctx.type, ctx.getValue(CTX_PARAMS), ctx.getValue(CTX_ARGS), ctx.providers);

    next();
};

/**
 * regist aspect action.
 *
 * @export
 */
export const RegistAspectAction = function (ctx: DesignContext, next: () => void): void {
    let type = ctx.type;
    let aspectMgr = ctx.reflects.getActionInjector().getInstance(AdvisorToken);
    aspectMgr.add(type);
    next();
};

/**
 *  match pointcut action.
 *
 * @export
 */
export const MatchPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    let reflects = ctx.reflects;
    if (!isValAspectTag(ctx.type, reflects)) {
        return next();
    }

    let advisor = reflects.getActionInjector().getInstance(AdvisorToken);
    let matcher = reflects.getActionInjector().getInstance(AdviceMatcherToken);
    let targetType = ctx.type;

    advisor.aspects.forEach((adviceMetas, type) => {
        let matchpoints = matcher.match(type, targetType, adviceMetas, ctx.target);
        matchpoints.forEach(mpt => {
            let name = mpt.name;
            let advice = mpt.advice;

            let advices = advisor.getAdvices(targetType, name);
            if (!advices) {
                advices = {
                    Before: [],
                    Pointcut: [],
                    After: [],
                    Around: [],
                    AfterThrowing: [],
                    AfterReturning: []
                } as Advices;
                advisor.setAdvices(targetType, name, advices);
            }
            let advicer = Object.assign(mpt, {
                aspectType: type
            }) as Advicer;

            if (advice.adviceName === 'Before') {
                if (!advices.Before.some(a => equals(a, advicer))) {
                    advices.Before.push(advicer);
                }
            } else if (advice.adviceName === 'Pointcut') {
                if (!advices.Pointcut.some(a => equals(a, advicer))) {
                    advices.Pointcut.push(advicer);
                }
            } else if (advice.adviceName === 'Around') {
                if (!advices.Around.some(a => equals(a, advicer))) {
                    advices.Around.push(advicer);
                }
            } else if (advice.adviceName === 'After') {
                if (!advices.After.some(a => equals(a, advicer))) {
                    advices.After.push(advicer);
                }
            } else if (advice.adviceName === 'AfterThrowing') {
                if (!advices.AfterThrowing.some(a => equals(a, advicer))) {
                    advices.AfterThrowing.push(advicer);
                }
            } else if (advice.adviceName === 'AfterReturning') {
                if (!advices.AfterReturning.some(a => equals(a, advicer))) {
                    advices.AfterReturning.push(advicer);
                }
            }
        });
    });
    next();
}

function equals(a: Advicer, b: Advicer) {
    return a.aspectType === b.aspectType && a.advice.propertyKey === b.advice.propertyKey;
}



/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
function isValAspectTag(targetType: Type, reflects: ITypeReflects): boolean {
    if (!isClass(targetType) || isBaseType(targetType)) {
        return false;
    }
    if (targetType.ρNPT) {
        return false;
    }
    return !reflects.hasMetadata(NonePointcut, targetType)
}
