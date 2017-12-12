
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
            // console.log('matchpoints:', matchpoints);
            matchpoints.forEach(mpt => {
                if (mpt.name !== 'constructor') {
                    if (isFunction(data.target[mpt.name])) {
                        let target = data.target;
                        let advice = mpt.advice;
                        let advices: Advices;
                        let methodName = mpt.name;
                        let advicesFiled = methodName + '__advices';
                        if (!target[advicesFiled]) {
                            target[advicesFiled] = {
                                Before: [],
                                After: [],
                                Around: [],
                                AfterThrowing: [],
                                AfterReturning: []
                            } as Advices;

                            advices = target[advicesFiled] as Advices;
                            let propertyMethod = target[methodName].bind(target);
                            target[methodName] = ((...args: any[]) => {
                                let val;
                                let joinPoint = {
                                    name: methodName,
                                    fullName: mpt.fullName,
                                    target: target,
                                    targetType: data.targetType
                                } as Joinpoint;

                                advices.Before.forEach(advicer => {
                                    joinPoint.state = JoinpointState.Before;
                                    access.syncInvoke(type, advicer.advice.propertyKey, advicer.aspect, {
                                        value: joinPoint,
                                        index: 0
                                    });
                                });

                                advices.Around.forEach(advicer => {
                                    joinPoint.state = JoinpointState.Before;
                                    joinPoint.args = args;
                                    access.syncInvoke(type, advicer.advice.propertyKey, advicer.aspect, {
                                        value: joinPoint,
                                        index: 0
                                    });
                                });

                                let adviceAction = (state: JoinpointState, isAsync: boolean, returnValue?: any, throwError?: any) => {
                                    joinPoint.state = state;
                                    if (!isUndefined(returnValue)) {
                                        joinPoint.returning = returnValue;
                                    }
                                    if (!isUndefined(throwError)) {
                                        joinPoint.throwing = throwError;
                                    }
                                    if (isAsync) {
                                        return access.invoke(type, advice.propertyKey, aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                    } else {
                                        return access.syncInvoke(type, advice.propertyKey, aspect, {
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
                                                    await adviceAction(state, true, hasReturn ? val : undefined, throwError);
                                                    return value;
                                                });
                                            });
                                        });
                                    } else {
                                        propertyKeys.forEach(propertyKey => {
                                            let hasReturn = ['AfterReturning', 'Around'].indexOf(propertyKey) >= 0;
                                            advices[propertyKey].forEach((advicer: Advicer) => {
                                                adviceAction(state, false, hasReturn ? val : undefined, throwError)
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
                        } else {
                            advices = target[advicesFiled] as Advices
                        }

                        if (advice.adviceName === 'Before') {
                            if (!advices.Before.some(a => a.advice === advice && a.aspect === aspect)) {
                                // console.log('add Before:', advice);
                                advices.Before.push({ advice: advice, aspect: aspect });
                            }
                        } else if (advice.adviceName === 'Around') {
                            if (!advices.Around.some(a => a.advice === advice && a.aspect === aspect)) {
                                console.log('add Around:', advice);
                                advices.Around.push({ advice: advice, aspect: aspect });
                            }
                        } else if (advice.adviceName === 'After') {
                            if (!advices.After.some(a => a.advice === advice && a.aspect === aspect)) {
                                advices.After.push({ advice: advice, aspect: aspect });
                            }
                        } else if (advice.adviceName === 'AfterThrowing') {
                            if (!advices.AfterThrowing.some(a => a.advice === advice && a.aspect === aspect)) {
                                advices.AfterThrowing.push({ advice: advice, aspect: aspect });
                            }
                        } else if (advice.adviceName === 'AfterReturning') {
                            if (!advices.AfterReturning.some(a => a.advice === advice && a.aspect === aspect)) {
                                advices.AfterReturning.push({ advice: advice, aspect: aspect });
                            }
                        }

                    }
                }
            });
        });
    }
}
