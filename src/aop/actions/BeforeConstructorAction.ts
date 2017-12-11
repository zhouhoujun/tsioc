
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


export interface BeforeConstructorActionData extends ActionData<AdviceMetadata> {
    paramTypes: Token<any>[];
    params: any[];
}

export class BeforeConstructorAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: BeforeConstructorActionData) {
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
                access.syncInvoke(type, mpt.advice.propertyKey, aspect, ...data.params);
            });
        });
    }
}
