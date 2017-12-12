import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass } from '../../utils';
import { AopActions } from './AopActions';
import { Aspect } from '../decorators';
import { AdviceMetadata } from '../metadatas'
import { Token } from '../../types';
import { Advice, symbols } from '../../index';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Advices } from '../Advices';
import { Joinpoint, JoinpointState } from '../Joinpoint';


export interface InvokeBeforeConstructorActionData extends ActionData<AdviceMetadata> {

}

export class InvokeBeforeConstructorAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: InvokeBeforeConstructorActionData) {
        // aspect class do nothing.
        if (Reflect.hasMetadata(Aspect.toString(), data.targetType)) {
            return;
        }

        let aspects = container.get(AspectSet);
        let advices = aspects.getAdvices(data.targetType.name + '.constructor');
        if (!advices) {
            return;
        }

        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        advices.Before.forEach(advicer => {
            let joinPoint = {
                name: 'constructor',
                fullName: data.targetType.name + '.constructor',
                target: data.target,
                targetType: data.targetType
            } as Joinpoint;
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                value: joinPoint,
                index: 0
            });
        });
        advices.Around.forEach(advicer => {
            let joinPoint = {
                args: data.args,
                state: JoinpointState.Before,
                name: 'constructor',
                fullName: data.targetType.name + '.constructor',
                target: data.target,
                targetType: data.targetType
            } as Joinpoint;
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                value: joinPoint,
                index: 0
            });
        });
    }
}
