import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass, symbols } from '../../utils';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators';
import { AdviceMetadata } from '../metadatas'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Advices } from '../Advices';
import { Joinpoint, JoinpointState } from '../Joinpoint';

export interface AfterConstructorActionData extends ActionData<AdviceMetadata> {
}

export class AfterConstructorAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: AfterConstructorActionData) {
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
        advices.After.forEach(advicer => {
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
                state: JoinpointState.After,
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
