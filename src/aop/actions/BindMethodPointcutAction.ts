
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
import { stat } from 'fs';
import { Advices, Advicer } from '../Advices';


export interface BindPointcutActionData extends ActionData<Joinpoint> {
}

export class BindMethodPointcutAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: BindPointcutActionData) {
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
                if (isFunction(data.target[mpt.name])) {
                    let target = data.target;
                    let methodName = mpt.name;
                    let fullName = mpt.fullName;
                    let advice = mpt.advice;
                    let bindTarget = data.targetType;

                    let advices = aspects.getAdvices(fullName);
                    if (!advices) {
                        advices  = {
                            Before: [],
                            After: [],
                            Around: [],
                            AfterThrowing: [],
                            AfterReturning: []
                        } as Advices;
                        aspects.setAdvices(fullName, advices);
                        if (methodName !== 'constructor') {
                            let propertyMethod = target[methodName].bind(target);
                            target[methodName] = ((...args: any[]) => {
                                let advices = aspects.getAdvices(fullName);
                                let val;
                                let joinPoint = {
                                    name: methodName,
                                    fullName: fullName,
                                    target: target,
                                    targetType: data.targetType
                                } as Joinpoint;

                                advices.Before.forEach(advicer => {
                                    joinPoint.state = JoinpointState.Before;
                                    access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                                        value: joinPoint,
                                        index: 0
                                    });
                                });

                                advices.Around.forEach(advicer => {
                                    joinPoint.state = JoinpointState.Before;
                                    joinPoint.args = args;
                                    access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                                        value: joinPoint,
                                        index: 0
                                    });
                                });

                                let adviceAction = (advicer: Advicer, state: JoinpointState, isAsync: boolean, returnValue?: any, throwError?: any) => {
                                    joinPoint.state = state;
                                    if (!isUndefined(returnValue)) {
                                        joinPoint.returning = returnValue;
                                    }
                                    if (!isUndefined(throwError)) {
                                        joinPoint.throwing = throwError;
                                    }
                                    if (isAsync) {
                                        return access.invoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                    } else {
                                        return access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                    }
                                }

                                let asResult = (propertyKeys: string[], state: JoinpointState, val, throwError?: any) => {
                                    if (isPromise(val)) {
                                        propertyKeys.forEach(propertyKey => {
                                            let hasReturn = ['AfterReturning', 'Around'].indexOf(propertyKey) >= 0;
                                            advices[propertyKey].forEach((advicer: Advicer) => {
                                                val = val.then(async (value) => {
                                                    await adviceAction(advicer, state, true, hasReturn ? val : undefined, throwError);
                                                    return value;
                                                });
                                            });
                                        });
                                    } else {
                                        propertyKeys.forEach(propertyKey => {
                                            let hasReturn = ['AfterReturning', 'Around'].indexOf(propertyKey) >= 0;
                                            advices[propertyKey].forEach((advicer: Advicer) => {
                                                adviceAction(advicer, state, false, hasReturn ? val : undefined, throwError)
                                            });
                                        });
                                    }
                                }

                                try {
                                    val = propertyMethod(...args);
                                    asResult(['Around', 'After'], JoinpointState.After, val);
                                } catch (err) {
                                    asResult(['After', 'Around', 'AfterThrowing'], JoinpointState.After, val, err);
                                    throw err;
                                }

                                asResult(['AfterReturning', 'Around'], JoinpointState.AfterReturning, val);
                                return val;
                            });
                        }
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
