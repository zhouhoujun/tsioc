import { RuntimeActionContext } from '@tsdi/ioc';
import { AdvisorToken } from '../IAdvisor';
import { AdviceMatcherToken } from '../IAdviceMatcher';
import { Advicer } from '../advices/Advicer';
import { Advices } from '../advices/Advices';
import { isValideAspectTarget } from './isValideAspectTarget';

/**
 *  match pointcut action.
 *
 * @export
 */
export const MatchPointcutAction = function (ctx: RuntimeActionContext, next: () => void): void {
    // aspect class do nothing.
    if (!isValideAspectTarget(ctx.type, ctx.reflects)) {
        return next();
    }

    let injector = ctx.injector;
    let advisor = injector.getInstance(AdvisorToken);
    let matcher = injector.getInstance(AdviceMatcherToken);
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

