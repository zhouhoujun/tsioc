
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
import { Pointcut } from '../Pointcut';


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
        let methods: Pointcut[] = [];
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
                                let hasReturn = ['AfterReturning', 'Around'].indexOf(propertyKey) >= 0;
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
                    } catch (err) {
                        asResult(['After', 'Around', 'AfterThrowing'], JoinpointState.After, val, err);
                        throw err;
                    }

                    val = asResult(['AfterReturning', 'Around'], JoinpointState.AfterReturning, val);
                    return val;
                });
            }
        });
    }
}
