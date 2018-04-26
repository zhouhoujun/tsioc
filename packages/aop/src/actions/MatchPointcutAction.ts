
import {
    IContainer, ActionData, ActionComposite, symbols
} from '@ts-ioc/core';
import { IAdvisor } from '../IAdvisor';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints/index';
import { Advices, Advicer } from '../advices/index';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { AopSymbols } from '../symbols';


/**
 * match pointcut action data.
 *
 * @export
 * @interface MatchPointcutActionData
 * @extends {ActionData<Joinpoint>}
 */
export interface MatchPointcutActionData extends ActionData<Joinpoint> {
}

/**
 *  match pointcut action.
 *
 * @export
 * @class MatchPointcutAction
 * @extends {ActionComposite}
 */
export class MatchPointcutAction extends ActionComposite {

    constructor() {
        super(AopActions.matchPointcut);
    }

    protected working(container: IContainer, data: MatchPointcutActionData) {
        // aspect class do nothing.
        if (!isValideAspectTarget(data.targetType)) {
            return;
        }
        let advisor = container.get<IAdvisor>(AopSymbols.IAdvisor);
        let matcher = container.get<IAdviceMatcher>(AopSymbols.IAdviceMatcher);
        advisor.aspects.forEach((adviceMetas, type) => {
            let matchpoints = matcher.match(type, data.targetType, adviceMetas);
            matchpoints.forEach(mpt => {
                let fullName = mpt.fullName;
                let advice = mpt.advice;

                let advices = advisor.getAdvices(fullName);
                if (!advices) {
                    advices = {
                        Before: [],
                        Pointcut: [],
                        After: [],
                        Around: [],
                        AfterThrowing: [],
                        AfterReturning: []
                    } as Advices;
                    advisor.setAdvices(fullName, advices);
                }
                let advicer = Object.assign(mpt, {
                    aspectType: type
                }) as Advicer;

                if (advice.adviceName === 'Before') {
                    if (!advices.Before.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.Before.push(advicer);
                    }
                } else if (advice.adviceName === 'Pointcut') {
                    if (!advices.Pointcut.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.Pointcut.push(advicer);
                    }
                } else if (advice.adviceName === 'Around') {
                    if (!advices.Around.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.Around.push(advicer);
                    }
                } else if (advice.adviceName === 'After') {
                    if (!advices.After.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.After.push(advicer);
                    }
                } else if (advice.adviceName === 'AfterThrowing') {
                    if (!advices.AfterThrowing.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.AfterThrowing.push(advicer);
                    }
                } else if (advice.adviceName === 'AfterReturning') {
                    if (!advices.AfterReturning.some(a => this.isAdviceEquals(a.advice, advice))) {
                        advices.AfterReturning.push(advicer);
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
