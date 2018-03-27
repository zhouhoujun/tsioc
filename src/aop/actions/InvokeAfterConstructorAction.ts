import { DecoratorType, ActionData, ActionComposite, Provider, getOwnMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAdvisor } from '../IAdvisor';
import { symbols } from '../../utils/index';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints/index';
import { Advices, Advicer } from '../advices/index';
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

        let aspectMgr = container.get<IAdvisor>(symbols.IAdvisor);
        let advices = aspectMgr.getAdvices(data.targetType.name + '.constructor');
        if (!advices) {
            return;
        }
        let targetType = data.targetType;
        let target = data.target;

        let joinPoint = container.resolve(Joinpoint, Provider.create('options', <IJoinpoint>{
            name: 'constructor',
            state: JoinpointState.After,
            fullName: targetType.name + '.constructor',
            target: target,
            args: data.args,
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
