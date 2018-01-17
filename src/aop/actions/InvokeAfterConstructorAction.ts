import { DecoratorType, ActionData, ActionComposite, Provider, getOwnMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../IAspectManager';
import { isClass, symbols } from '../../utils/index';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Advices } from '../Advices';
import { Joinpoint, JoinpointState } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { IJoinpoint } from '../../index';

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

        let aspectMgr = container.get<IAspectManager>(symbols.IAspectManager);
        let advices = aspectMgr.getAdvices(data.targetType.name + '.constructor');
        if (!advices) {
            return;
        }
        let targetType = data.targetType;
        let target = data.target;

        let joinPoint = container.resolve(Joinpoint, Provider.createParam('options', <IJoinpoint>{
            name: 'constructor',
            state: JoinpointState.After,
            fullName: targetType.name + '.constructor',
            target: target,
            targetType: targetType
        }));
        let providers = [Provider.create(Joinpoint, joinPoint)];

        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        advices.After.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers);
        });

        advices.Around.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers);
        });
    }
}
