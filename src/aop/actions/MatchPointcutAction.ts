
import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../IAspectManager';
import { isClass, symbols, isPromise, isFunction, isUndefined } from '../../utils/index';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Joinpoint, JoinpointState } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';
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
        let aspectmgr = container.get<IAspectManager>(symbols.IAspectManager);
        let matcher = container.get<IAdviceMatcher>(symbols.IAdviceMatcher);
        aspectmgr.aspects.forEach((adviceMetas, type) => {
            let matchpoints = matcher.match(type, data.targetType, adviceMetas);
            matchpoints.forEach(mpt => {
                let fullName = mpt.fullName;
                let advice = mpt.advice;

                let advices = aspectmgr.getAdvices(fullName);
                if (!advices) {
                    advices = {
                        Before: [],
                        Pointcut: [],
                        After: [],
                        Around: [],
                        AfterThrowing: [],
                        AfterReturning: []
                    } as Advices;
                    aspectmgr.setAdvices(fullName, advices);
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
