import { IContainer, ActionData, ActionComposite, Provider, IMethodAccessor, getClassName, MethodAccessorToken } from '@ts-ioc/core';
import { IAdvisor, AdvisorToken } from '../IAdvisor';
import { AopActions } from './AopActions';
import { Advice, Aspect } from '../decorators';
import { AdviceMetadata } from '../metadatas'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints';
import { Advices, Advicer } from '../advices';
import { isValideAspectTarget } from '../isValideAspectTarget';

/**
 * action data for invoke before constructor action.
 *
 * @export
 * @interface InvokeBeforeConstructorActionData
 * @extends {ActionData<AdviceMetadata>}
 */
export interface InvokeBeforeConstructorActionData extends ActionData<AdviceMetadata> {

}

/**
 * actions invoke before constructor.
 *
 * @export
 * @class InvokeBeforeConstructorAction
 * @extends {ActionComposite}
 */
export class InvokeBeforeConstructorAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: InvokeBeforeConstructorActionData) {
        // aspect class do nothing.
        if (!isValideAspectTarget(data.targetType)) {
            return;
        }

        let advisor = container.get(AdvisorToken);
        let className = getClassName(data.targetType);
        let advices = advisor.getAdvices(className + '.constructor');
        if (!advices) {
            return;
        }

        let targetType = data.targetType;
        let target = data.target;

        let joinPoint = container.resolve(Joinpoint, Provider.create('options', <IJoinpoint>{
            name: 'constructor',
            state: JoinpointState.Before,
            fullName: className + '.constructor',
            target: target,
            args: data.args,
            params: data.params,
            targetType: targetType
        }));
        let providers = [Provider.create(Joinpoint, joinPoint)];

        let access = container.get(MethodAccessorToken);
        advices.Before.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers); // new Joinpoint(joinPoint) // container.resolve(Joinpoint, { json: joinPoint })
        });

        advices.Around.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers);
        });

    }
}
