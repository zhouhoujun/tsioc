import { isClass, Type, isBaseType, RuntimeContext, DesignContext, refl} from '@tsdi/ioc';
import { ProceedingScope } from './proceed';
import { Advicer } from '../advices/Advicer';
import { Advices } from '../advices/Advices';
import { AdvisorToken, AdviceMatcherToken } from '../tk';
import { AopReflect } from '../types';


/**
 * execute bind method pointcut action.
 */
export const BindMthPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    const reflect = ctx.targetReflect as AopReflect;
    if (!ctx.instance || !isValAspectTag(ctx.type, reflect)) {
        return next();
    }

    const actInjtor = ctx.injector.getContainer().getActionInjector();
    let scope = actInjtor.getInstance(ProceedingScope);

    let target = ctx.instance;
    let targetType = ctx.type;

    let className = reflect.class.className;
    let decorators = reflect.class.getPropertyDescriptors();
    let advisor = actInjtor.getInstance(AdvisorToken);
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
    const reflect = ctx.targetReflect as AopReflect;
    if (!isValAspectTag(ctx.type, reflect)) {
        return next();
    }

    ctx.injector.getContainer().getActionInjector()
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
    const reflect = ctx.targetReflect as AopReflect;
    if (!ctx.instance || !isValAspectTag(ctx.type, reflect)) {
        return next();
    }

    ctx.injector.getContainer().getActionInjector()
        .getInstance(ProceedingScope)
        .afterConstr(ctx.instance, ctx.type, ctx.params, ctx.args, ctx.providers);

    next();
};

/**
 * regist aspect action.
 *
 * @export
 */
export const RegistAspectAction = function (ctx: DesignContext, next: () => void): void {
    let type = ctx.type;
    let advisor = ctx.injector.getContainer().getActionInjector().getInstance(AdvisorToken);
    advisor.add(type);
    next();
};

/**
 *  match pointcut action.
 *
 * @export
 */
export const MatchPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    const reflect = ctx.targetReflect as AopReflect;
    if (!isValAspectTag(ctx.type, reflect)) {
        return next();
    }

    const actInjtor = ctx.injector.getContainer().getActionInjector();
    let advisor = actInjtor.getInstance(AdvisorToken);
    let matcher = actInjtor.getInstance(AdviceMatcherToken);
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
    if (!isClass(targetType) || isBaseType(targetType)) {
        return false;
    }
    if (targetType.ρNPT) {
        return false;
    }
    return !reflect.nonePointcut
}
