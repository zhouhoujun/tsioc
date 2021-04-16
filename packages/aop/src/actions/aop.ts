import { Type, RuntimeContext, refl, AnnotationType} from '@tsdi/ioc';
import { ProceedingScope } from './proceed';
import { Advicer } from '../advices/Advicer';
import { Advices } from '../advices/Advices';
import { ADVISOR, ADVICE_MATCHER } from '../tk';
import { AopReflect } from '../types';


/**
 * execute bind method pointcut action.
 */
export const BindMthPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    // ctx.type had checked.
    if (!ctx.instance || !isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next();
    }

    const actpdr = ctx.root.action();
    const scope = actpdr.getInstance(ProceedingScope);

    const target = ctx.instance;
    const targetType = ctx.type;

    const className = ctx.reflect.class.className;
    const decorators = ctx.reflect.class.getPropertyDescriptors();
    const advicesMap = actpdr.getInstance(ADVISOR).getAdviceMap(targetType);

    if (advicesMap && advicesMap.size) {
        advicesMap.forEach((advices, name) => {
            if (name === 'constructor') {
                return;
            }
            const pointcut = {
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
    if (!isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next();
    }

    ctx.root.action()
        .getInstance(ProceedingScope)
        .beforeConstr(ctx.type, ctx.params, ctx.args, ctx.providers);

    next();
};


/**
 * after constructor advice actions.
 *
 * @export
 */
export const AfterCtorAdviceAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!ctx.instance || !isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next();
    }

    ctx.root.action()
        .getInstance(ProceedingScope)
        .afterConstr(ctx.instance, ctx.type, ctx.params, ctx.args, ctx.providers);

    next();
};


/**
 *  match pointcut action.
 *
 * @export
 */
export const MatchPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!isValAspectTag(ctx.type, ctx.reflect as AopReflect)) {
        return next();
    }

    const acpdr = ctx.root.action();
    let advisor = acpdr.getInstance(ADVISOR);
    let matcher = acpdr.getInstance(ADVICE_MATCHER);
    let targetType = ctx.type;

    advisor.aspects.forEach(type => {
        let aopRef = refl.get<AopReflect>(type);
        let matchpoints = matcher.match(type, targetType, aopRef.advices, ctx.instance);
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
function isValAspectTag(targetType: Type, reflect: AopReflect): boolean {
    if ((targetType as AnnotationType).ρNPT) {
        return false;
    }
    return !reflect.nonePointcut
}
