import { ParamProviders, lang, RuntimeActionContext, CTX_ARGS, CTX_PARAMS } from '@tsdi/ioc';
import { AdvisorToken } from '../IAdvisor';
import { Joinpoint, JoinpointOptionToken, JoinpointOption } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/JoinpointState';
import { isValideAspectTarget } from './isValideAspectTarget';

/**
 * actions invoke before constructor.
 *
 * @export
 */
export const InvokeBeforeConstructorAction = function (ctx: RuntimeActionContext, next: () => void): void {
    // aspect class do nothing.
    if (!isValideAspectTarget(ctx.type, ctx.reflects)) {
        return next();
    }

    let container = ctx.getContainer();
    let advisor = container.getInstance(AdvisorToken);
    let className = lang.getClassName(ctx.type);
    let advices = advisor.getAdvices(ctx.type, 'constructor');
    if (!advices) {
        return next();
    }

    let targetType = ctx.type;
    let target = ctx.target;

    let joinPoint = container.getInstance(Joinpoint, {
        provide: JoinpointOptionToken,
        useValue: <JoinpointOption>{
            name: 'constructor',
            state: JoinpointState.Before,
            fullName: className + '.constructor',
            target: target,
            args: ctx.getValue(CTX_ARGS),
            params: ctx.getValue(CTX_PARAMS),
            targetType: targetType,
            originProvider: ctx.providers
        }
    });
    let providers: ParamProviders[] = [];
    if (ctx.providers.size) {
        providers.push(ctx.providers);
    }
    providers.push({ provide: Joinpoint, useValue: joinPoint });

    advices.Before.forEach(advicer => {
        container.getInjector(advicer.aspectType).invoke(advicer.aspectType, advicer.advice.propertyKey, ...providers);
    });

    advices.Pointcut.forEach(advicer => {
        container.getInjector(advicer.aspectType).invoke(advicer.aspectType, advicer.advice.propertyKey, ...providers);
    });

    advices.Around.forEach(advicer => {
        container.getInjector(advicer.aspectType).invoke(advicer.aspectType, advicer.advice.propertyKey, ...providers);
    });

    next();

};
