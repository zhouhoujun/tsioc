
import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass, symbols, isPromise, isFunction } from '../../utils';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AroundMetadata } from '../metadatas'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Joinpoint, JoinpointState, IJoinpoint } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { isUndefined } from 'util';
import { Advices, Advicer } from '../Advices';
import { IPointcut } from '../IPointcut';
import { Token } from '../../types';
import { ParamProvider } from '../../ParamProvider';

export interface BindPointcutActionData extends ActionData<Joinpoint> {
}

export class BindMethodPointcutAction extends ActionComposite {

    constructor() {
        super(AopActions.bindMethodPointcut);
    }

    protected working(container: IContainer, data: BindPointcutActionData) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget(data.targetType)) {
            return;
        }
        let aspects = container.get(AspectSet);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);

        let className = data.targetType.name;
        let methods: IPointcut[] = [];
        for (let name in Object.getOwnPropertyDescriptors(data.targetType.prototype)) {
            methods.push({
                name: name,
                fullName: `${className}.${name}`
            })
        }

        let target = data.target;

        methods.forEach(pointcut => {
            let fullName = pointcut.fullName;
            let methodName = pointcut.name;
            let advices = aspects.getAdvices(fullName);

            if (advices && methodName !== 'constructor') {
                let propertyMethod = target[methodName].bind(target);
                target[methodName] = ((...args: any[]) => {
                    let val;
                    let joinPoint = {
                        name: methodName,
                        fullName: fullName,
                        target: target,
                        targetType: data.targetType
                    } as IJoinpoint;

                    let adviceAction = (advicer: Advicer, state: JoinpointState, isAsync = false, returnValue?: any, throwError?: any) => {
                        let index = '';
                        let value;
                        joinPoint.state = state;
                        if (advicer.advice.adviceName === 'Around') {
                            joinPoint.args = args;
                            let metadata = advicer.advice as AroundMetadata;
                            if (state === JoinpointState.Before) {
                                index = metadata.args;
                            } else if (state === JoinpointState.AfterReturning) {
                                index = metadata.returning;
                                value = returnValue;
                            } else if (state === JoinpointState.AfterThrowing) {
                                index = metadata.throwing;
                                value = throwError;
                            }
                        }

                        if (advicer.advice.adviceName === 'Around') {
                            joinPoint.args = args;
                            joinPoint.returning = returnValue;
                            joinPoint.throwing = throwError;
                            let metadata = advicer.advice as AroundMetadata;
                            if (state === JoinpointState.Before) {
                                index = metadata.args;
                                value = args;
                            } else if (state === JoinpointState.AfterReturning) {
                                index = metadata.returning;
                                value = returnValue;
                            } else if (state === JoinpointState.AfterThrowing) {
                                index = metadata.throwing;
                                value = throwError;
                            }
                        }

                        if (advicer.advice.adviceName === 'AfterReturning') {
                            joinPoint.returning = returnValue;
                            let metadata = advicer.advice as AfterReturningMetadata;
                            index = metadata.returning;
                            value = returnValue;
                        }

                        if (advicer.advice.adviceName === 'AfterThrowing') {
                            joinPoint.throwing = throwError;
                            let metadata = advicer.advice as AfterThrowingMetadata;
                            index = metadata.throwing;
                            value = throwError;
                        }

                        let provider = {
                            value: index ? value : joinPoint,
                            index: index || 0
                        };

                        if (isAsync) {
                            return access.invoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, provider);
                        } else {
                            return access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, advicer.aspect, provider);
                        }
                    };

                    advices.Around.forEach(advicer => {
                        adviceAction(advicer, JoinpointState.Before);
                    });

                    advices.Before.forEach(advicer => {
                        adviceAction(advicer, JoinpointState.Before);
                    });

                    let asResult = (propertyKeys: string[], state: JoinpointState, val, throwError?: any) => {
                        if (isPromise(val)) {
                            propertyKeys.forEach(propertyKey => {
                                let hasReturn = ['Around', 'AfterReturning'].indexOf(propertyKey) >= 0;
                                advices[propertyKey].forEach((advicer: Advicer) => {
                                    val = val.then(async (value) => {
                                        let retval = await adviceAction(advicer, state, true, hasReturn ? value : undefined, throwError);
                                        if (hasReturn && !isUndefined(retval)) {
                                            return retval
                                        } else {
                                            return value;
                                        }
                                    });
                                });
                            });
                        } else {
                            propertyKeys.forEach(propertyKey => {
                                let hasReturn = ['Around', 'AfterReturning'].indexOf(propertyKey) >= 0;
                                advices[propertyKey].forEach((advicer: Advicer) => {
                                    let retval = adviceAction(advicer, state, false, hasReturn ? val : undefined, throwError);
                                    if (hasReturn && !isUndefined(retval)) {
                                        val = retval
                                    }
                                });
                            });
                        }
                        return val;
                    }

                    try {
                        val = propertyMethod(...args);
                        asResult(['Around', 'After'], JoinpointState.After, val);
                        val = asResult(['Around', 'AfterReturning'], JoinpointState.AfterReturning, val);
                        return val;
                    } catch (err) {
                        asResult(['Around', 'AfterThrowing'], JoinpointState.AfterThrowing, val, err);
                        throw err;
                    } finally {
                        asResult(['After'], JoinpointState.After, val);
                    }
                });
            }
        });
    }
}
