
import { DecoratorType, ActionData, ActionComposite } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass } from '../../utils';
import { AopActions } from './AopActions';
import { AdviceMetadata, Type, Aspect } from '../../index';


export interface BindPointcutAction extends ActionData<AdviceMetadata> {
    instance: any;
    instanceType: Type<any>
}

export class BindMethodPointcutAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(AopActions.registAspect.toString(), decorName, decorType);
    }

    protected working(container: IContainer, data: BindPointcutAction) {
        // aspect class do nothing.
        if (Reflect.hasMetadata(Aspect.toString(), data.instanceType)) {
            return;
        }
        let metadata = data.metadata || [];
        let aspects = container.get(AspectSet);
        aspects.forEach((type, aspect) => {
            
        });
    }
}
