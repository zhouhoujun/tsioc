import { IContainer, ActionData, ActionComposite, Provider, getClassName, Providers } from '@ts-ioc/core';
import { AdvisorToken } from '../IAdvisor';
import { AopActions } from './AopActions';
import { AdviceMetadata } from '../metadatas'
import { Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints';
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
        let providers: Providers[] = [Provider.create(Joinpoint, joinPoint)];
        if (data.providerMap) {
            providers.push(data.providerMap);
        }

        advices.After.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
        });

        advices.Around.forEach(advicer => {
            advisor.getContainer(advicer.aspectType, container).syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
        });
    }
}
