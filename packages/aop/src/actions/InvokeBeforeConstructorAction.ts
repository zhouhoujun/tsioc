import { ParamProviders, lang, RuntimeActionContext, IocRuntimeAction, CTX_ARGS, CTX_PARAMS } from '@tsdi/ioc';
import { AdvisorToken } from '../IAdvisor';
import { Joinpoint, JoinpointState, JoinpointOptionToken, JoinpointOption } from '../joinpoints';
import { isValideAspectTarget } from './isValideAspectTarget';

/**
 * actions invoke before constructor.
 *
 * @export
 * @class InvokeBeforeConstructorAction
 * @extends {IocRuntimeAction}
 */
export class InvokeBeforeConstructorAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void): void {
        // aspect class do nothing.
        if (!isValideAspectTarget(ctx.targetType, ctx.reflects)) {
            return next();
        }

        let advisor = this.container.get(AdvisorToken);
        let className = lang.getClassName(ctx.targetType);
        let advices = advisor.getAdvices(className + '.constructor');
        if (!advices) {
            return next();
        }

        let targetType = ctx.targetType;
        let target = ctx.target;

        let joinPoint = this.container.getInstance(Joinpoint, {
            provide: JoinpointOptionToken,
            useValue: <JoinpointOption>{
                name: 'constructor',
                state: JoinpointState.Before,
                fullName: className + '.constructor',
                target: target,
                args: ctx.getContext(CTX_ARGS),
                params: ctx.getContext(CTX_PARAMS),
                targetType: targetType,
                originProvider: ctx.providerMap
            }
        });
        let providers: ParamProviders[] = [];
        if (ctx.providerMap) {
            providers.push(ctx.providerMap);
        }
        providers.push({ provide: Joinpoint, useValue: joinPoint });

        advices.Before.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, this.container).invoke(advicer.aspectType, advicer.advice.propertyKey, ...providers);
        });

        advices.Pointcut.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, this.container).invoke(advicer.aspectType, advicer.advice.propertyKey, ...providers);
        });

        advices.Around.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, this.container).invoke(advicer.aspectType, advicer.advice.propertyKey, ...providers);
        });

        next();

    }
}
