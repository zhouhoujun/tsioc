
import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass, symbols, isPromise } from '../../utils';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators';
import { AdviceMetadata } from '../metadatas'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { isFunction } from '../../utils';
import { Joinpoint, JoinpointState } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { isUndefined } from 'util';
import { Advices, Advicer } from '../Advices';


export interface MatchPointcutActionData extends ActionData<Joinpoint> {
}

export class MatchPointcutAction extends ActionComposite {

    constructor() {
        super(AopActions.matchPointcut);
    }

    protected working(container: IContainer, data: MatchPointcutActionData) {
        // aspect class do nothing.
        if (!isValideAspectTarget(data.targetType)) {
            return;
        }
        let aspects = container.get(AspectSet);
        let matcher = container.get<IAdviceMatcher>(symbols.IAdviceMatcher);
        aspects.forEach((type, aspect) => {
            let adviceMaps = getMethodMetadata<AdviceMetadata>(Advice, type);
            let matchpoints = matcher.match(adviceMaps, data.targetType);
            matchpoints.forEach(mpt => {
                let fullName = mpt.fullName;
                let advice = mpt.advice;

                let advices = aspects.getAdvices(fullName);
                if (!advices) {
                    advices = {
                        Before: [],
                        After: [],
                        Around: [],
                        AfterThrowing: [],
                        AfterReturning: []
                    } as Advices;
                    aspects.setAdvices(fullName, advices);
                }

                if (advice.adviceName === 'Before') {
                    if (!advices.Before.some(a => this.isAdviceEquals(a.advice, advice) && a.aspect === aspect)) {
                        advices.Before.push({ advice: advice, aspect: aspect, aspectType: type });
                    }
                } else if (advice.adviceName === 'Around') {
                    if (!advices.Around.some(a => this.isAdviceEquals(a.advice, advice) && a.aspect === aspect)) {
                        advices.Around.push({ advice: advice, aspect: aspect, aspectType: type });
                    }
                } else if (advice.adviceName === 'After') {
                    if (!advices.After.some(a => this.isAdviceEquals(a.advice, advice) && a.aspect === aspect)) {
                        advices.After.push({ advice: advice, aspect: aspect, aspectType: type });
                    }
                } else if (advice.adviceName === 'AfterThrowing') {
                    if (!advices.AfterThrowing.some(a => this.isAdviceEquals(a.advice, advice) && a.aspect === aspect)) {
                        advices.AfterThrowing.push({ advice: advice, aspect: aspect, aspectType: type });
                    }
                } else if (advice.adviceName === 'AfterReturning') {
                    if (!advices.AfterReturning.some(a => this.isAdviceEquals(a.advice, advice) && a.aspect === aspect)) {
                        advices.AfterReturning.push({ advice: advice, aspect: aspect, aspectType: type });
                    }
                }

            });
        });
    }

    isAdviceEquals(advice1: AdviceMetadata, advice2: AdviceMetadata) {
        if (!advice1 || !advice2) {
            return false;
        }
        if (advice1 === advice2) {
            return true;
        }

        return advice1.adviceName === advice2.adviceName
            && advice1.pointcut === advice2.pointcut
            && advice1.propertyKey === advice2.propertyKey;
    }
}
