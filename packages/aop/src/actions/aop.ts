import { Type, RuntimeContext, refl, AnnotationType, ctorName } from '@tsdi/ioc';
import { ProceedingScope } from './proceed';
import { Advicer } from '../advices/Advicer';
import { Advices } from '../advices/Advices';
import { ADVICE_MATCHER } from '../metadata/tk';
import { AopReflect } from '../metadata/ref';
import { Advisor } from '../Advisor';


/**
 * execute bind method pointcut action.
 */
export const BindMthPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    // ctx.type had checked.
    if (!ctx.instance || !isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next()
    }

    const platform = ctx.injector.platform();
    const scope = platform.getAction(ProceedingScope);

    const target = ctx.instance;
    const targetType = ctx.type;

    const className = ctx.reflect.class.className;
    const decorators = ctx.reflect.class.getPropertyDescriptors();
    const advicesMap = platform.getActionValue(Advisor).getAdviceMap(targetType);

    if (advicesMap && advicesMap.size) {
        advicesMap.forEach((advices, name) => {
            if (name === ctorName) {
                return
            }
            const pointcut = {
                name: name,
                fullName: `${className}.${name}`,
                descriptor: decorators[name]
            }
            scope.proceed(target, targetType, advices, pointcut)
        })
    }

    next()
};


/**
 * before constructor advice actions.
 *
 * @export
 */
export const BeforeCtorAdviceAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next()
    }

    ctx.injector.platform()
        .getAction(ProceedingScope)
        .beforeConstr(ctx.type, ctx.params, ctx.args, ctx.injector, ctx.context);

    next()
}

/**
 * after constructor advice actions.
 *
 * @export
 */
export const AfterCtorAdviceAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!ctx.instance || !isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next()
    }

    ctx.injector.platform()
        .getAction(ProceedingScope)
        .afterConstr(ctx.instance, ctx.type, ctx.params, ctx.args, ctx.injector, ctx.context);

    next()
}


/**
 *  match pointcut action.
 *
 * @export
 */
export const MatchPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next()
    }

    const platform = ctx.injector.platform();
    const advisor = platform.getActionValue(Advisor);
    const matcher = platform.getActionValue(ADVICE_MATCHER);
    const targetType = ctx.type;

    advisor.aspects.forEach(aspect => {
        const aopRef = refl.get<AopReflect>(aspect.type);
        const matchpoints = matcher.match(aspect.type, targetType, aopRef.advices, ctx.instance);
        matchpoints.forEach(mpt => {
            const name = mpt.name;
            const advice = mpt.advice;

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
                advisor.setAdvices(targetType, name, advices)
            }
            
            const advicer = {
                ...mpt,
                aspect
            } as Advicer;

            if (advice.adviceName === 'Before') {
                if (!advices.Before.some(a => equals(a, advicer))) {
                    if (!advices.syncBefore && advicer.advice.sync) {
                        advices.syncBefore = true
                    }
                    advices.Before.push(advicer)
                }
            } else if (advice.adviceName === 'Pointcut') {
                if (!advices.Pointcut.some(a => equals(a, advicer))) {
                    if (!advices.syncPointcut && advicer.advice.sync) {
                        advices.syncPointcut = true
                    }
                    advices.Pointcut.push(advicer)
                }
            } else if (advice.adviceName === 'Around') {
                if (!advices.Around.some(a => equals(a, advicer))) {
                    if (!advices.syncAround && advicer.advice.sync) {
                        advices.syncAround = true
                    }
                    advices.Around.push(advicer)
                }
            } else if (advice.adviceName === 'After') {
                if (!advices.After.some(a => equals(a, advicer))) {
                    if (!advices.syncAfter && advicer.advice.sync) {
                        advices.syncAfter = true
                    }
                    advices.After.push(advicer)
                }
            } else if (advice.adviceName === 'AfterThrowing') {
                if (!advices.AfterThrowing.some(a => equals(a, advicer))) {
                    if (!advices.syncAfterThrowing && advicer.advice.sync) {
                        advices.syncAfterThrowing = true
                    }
                    advices.AfterThrowing.push(advicer)
                }
            } else if (advice.adviceName === 'AfterReturning') {
                if (!advices.AfterReturning.some(a => equals(a, advicer))) {
                    if (!advices.syncAfterReturning && advicer.advice.sync) {
                        advices.syncAfterReturning = true
                    }
                    advices.AfterReturning.push(advicer)
                }
            }
        })
    });

    next()
}

function equals(a: Advicer, b: Advicer) {
    return a.aspect.type === b.aspect.type && a.advice.propertyKey === b.advice.propertyKey
}

/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
function isValAspectTag(targetType: Type, reflect: AopReflect): boolean {
    if ((targetType as AnnotationType).ƿNPT) {
        return false
    }
    return !reflect.nonePointcut
}
