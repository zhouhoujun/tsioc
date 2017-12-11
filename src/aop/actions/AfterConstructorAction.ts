
import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass, symbols } from '../../utils';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators';
import { AdviceMetadata } from '../metadatas'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';

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
        let matcher = container.get<IAdviceMatcher>(symbols.IAdviceMatcher);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        aspects.forEach((type, aspect) => {
            let adviceMaps = getMethodMetadata<AdviceMetadata>(Advice, type);
            let matchpoints = matcher.match(adviceMaps, data.targetType, data.target);
            matchpoints.forEach(mpt => {
                access.syncInvoke(type, mpt.advice.propertyKey, aspect, data.target);
            });
        });
    }
}
