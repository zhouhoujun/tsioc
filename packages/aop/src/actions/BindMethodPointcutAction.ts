import { RuntimeContext, lang } from '@tsdi/ioc';
import { isValideAspectTarget } from './isValideAspectTarget';
import { AdvisorToken } from '../IAdvisor';
import { ProceedingScope } from '../proceeding/ProceedingScope';


/**
 * execute bind method pointcut action.
 *
 * @param {RuntimeContext} ctx
 * @param {() => void} next
 * @returns {void}
 */
export const BindMethodPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    let reflects = ctx.reflects;
    if (!ctx.target || !isValideAspectTarget(ctx.type, reflects)) {
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
