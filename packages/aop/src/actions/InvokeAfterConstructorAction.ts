import { IContainer, ActionData, ActionComposite, Provider, IMethodAccessor, getClassName, MethodAccessorToken } from '@ts-ioc/core';
import { IAdvisor, AdvisorToken } from '../IAdvisor';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints/index';
import { Advices, Advicer } from '../advices/index';
import { isValideAspectTarget } from '../isValideAspectTarget';

/**
 * invoke after constructor action data.
 *
 * @export
 * @interface InvokeAfterConstructorActionData
 * @extends {ActionData<AdviceMetadata>}
 */
export interface InvokeAfterConstructorActionData extends ActionData<AdviceMetadata> {
}

/**
 * invoke after constructor action.
 *
 * @export
 * @class InvokeAfterConstructorAction
 * @extends {ActionComposite}
 */
export class InvokeAfterConstructorAction extends ActionComposite {

    constructor() {
        super(AopActions.invokeAfterConstructorAdvices);
    }

    protected working(container: IContainer, data: InvokeAfterConstructorActionData) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget(data.targetType)) {
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
            state: JoinpointState.After,
            fullName: className + '.constructor',
            target: target,
            args: data.args,
            params: data.params,
            targetType: targetType
        }));
        let providers = [Provider.create(Joinpoint, joinPoint)];

        let access = container.get(MethodAccessorToken);
        advices.After.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers);
        });

        advices.Around.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers);
        });
    }
}
