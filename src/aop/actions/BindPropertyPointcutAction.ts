
import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass, symbols, isFunction } from '../../utils';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators';
import { AdviceMetadata } from '../metadatas';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { isValideAspectTarget } from '../isValideAspectTarget';


export interface BindPropertyPointcutActionData extends ActionData<AdviceMetadata> {
}

export class BindPropertyPointcutAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: BindPropertyPointcutActionData) {
        // aspect class do nothing.
        if (!isValideAspectTarget(data.targetType)) {
            return;
        }
        let aspects = container.get(AspectSet);
        let matcher = container.get<IAdviceMatcher>(symbols.IAdviceMatcher);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        aspects.forEach((type, aspect) => {
            let adviceMaps = getMethodMetadata<AdviceMetadata>(Advice, type);
            let matchpoints = matcher.match(adviceMaps, data.targetType, data.target);
            matchpoints.forEach(mpt => {
                // TODO: property work.

                // if (mpt.name !== 'constructor' && data.target) {
                //     let propertyMethod = data.target[mpt.name];
                //     if (!isFunction(propertyMethod)) {
                //         // TODO: set
                //         Object.defineProperty(data.target, mpt.name, {
                //             value: undefined,
                //             get() {
                //                 this.value;
                //             },
                //             set(val: any) {
                //                 this.value = val;
                //             }
                //         })
                //     }
                // }
            });
        });
    }
}
