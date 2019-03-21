import { AdvisorToken } from '../IAdvisor';
import { Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { GlobalRegisterAction, Provider, ParamProviders, lang, RegisterActionContext } from '@ts-ioc/ioc';

/**
 * actions invoke before constructor.
 *
 * @export
 * @class InvokeBeforeConstructorAction
 * @extends {GlobalRegisterAction}
 */
export class InvokeBeforeConstructorAction extends GlobalRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void): void {
        // aspect class do nothing.
        if (!isValideAspectTarget(ctx.targetType)) {
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

        let joinPoint = this.container.resolve(Joinpoint, Provider.create('options', <IJoinpoint>{
            name: 'constructor',
            state: JoinpointState.Before,
            fullName: className + '.constructor',
            target: target,
            args: ctx.args,
            params: ctx.params,
            targetType: targetType
        }));
        let providers: ParamProviders[] = [Provider.create(Joinpoint, joinPoint)];

        if (ctx.providerMap) {
            providers.push(ctx.providerMap);
        }

        advices.Before.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, this.container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers); // new Joinpoint(joinPoint) // container.resolve(Joinpoint, { json: joinPoint })
        });

        advices.Around.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, this.container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
        });

        next();

    }
}
