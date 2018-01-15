import { DecoratorType, ActionData, ActionComposite, Provider, getMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../IAspectManager';
import { isClass, symbols } from '../../utils/index';
import { AopActions } from './AopActions';
import { Advice, Aspect } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { Token } from '../../types';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Advices } from '../Advices';
import { Joinpoint, JoinpointState } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';


export interface InvokeBeforeConstructorActionData extends ActionData<AdviceMetadata> {

}

export class InvokeBeforeConstructorAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: InvokeBeforeConstructorActionData) {
        // aspect class do nothing.
        if (!isValideAspectTarget(data.targetType)) {
            return;
        }

        let aspectMgr = container.get<IAspectManager>(symbols.IAspectManager);
        let advices = aspectMgr.getAdvices(data.targetType.name + '.constructor');
        if (!advices) {
            return;
        }

        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        advices.Before.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined,
                Provider.create(
                    Joinpoint,
                    () => container.resolve(Joinpoint, Provider.createParam('options', {
                        name: 'constructor',
                        fullName: data.targetType.name + '.constructor',
                        target: data.target,
                        targetType: data.targetType
                    })))); // new Joinpoint(joinPoint) // container.resolve(Joinpoint, { json: joinPoint })
        });

        advices.Around.forEach(advicer => {
            access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined,
                Provider.create(
                    Joinpoint,
                    () => container.resolve(Joinpoint, Provider.createParam('options', {
                        args: data.args,
                        state: JoinpointState.Before,
                        name: 'constructor',
                        fullName: data.targetType.name + '.constructor',
                        target: data.target,
                        targetType: data.targetType
                    }))))
        });

    }
}
