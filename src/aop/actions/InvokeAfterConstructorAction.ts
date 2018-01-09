import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectSet } from '../AspectSet';
import { isClass, symbols } from '../../utils/index';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Advices } from '../Advices';
import { Joinpoint, JoinpointState } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';

export interface InvokeAfterConstructorActionData extends ActionData<AdviceMetadata> {
}

export class InvokeAfterConstructorAction extends ActionComposite {

    constructor() {
        super(AopActions.invokeAfterConstructorAdvices);
    }

    protected working(container: IContainer, data: InvokeAfterConstructorActionData) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget(data.targetType)) {
            return;
        }

        let aspects = container.get<IAspectSet>(symbols.IAspectSet);
        let advices = aspects.getAdvices(data.targetType.name + '.constructor');
        if (!advices) {
            return;
        }

        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        advices.After.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                type: Joinpoint,
                value: {
                    name: 'constructor',
                    fullName: data.targetType.name + '.constructor',
                    target: data.target,
                    targetType: data.targetType
                }
            });
        });

        advices.Around.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                type: Joinpoint,
                value: {
                    state: JoinpointState.After,
                    name: 'constructor',
                    fullName: data.targetType.name + '.constructor',
                    target: data.target,
                    targetType: data.targetType
                }
            });
        });
    }
}
