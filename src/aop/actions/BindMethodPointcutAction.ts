
import { DecoratorType, ActionData, ActionComposite, Provider, hasOwnMethodMetadata, getOwnMethodMetadata, getParamerterNames } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../IAspectManager';
import { isArray, symbols, isPromise, isFunction, isUndefined, isObservable } from '../../utils/index';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AroundMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Joinpoint, JoinpointState, IJoinpoint } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { Advices, Advicer } from '../Advices';
import { IPointcut } from '../IPointcut';
import { Token, ObjectMap } from '../../types';

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
        let aspectMgr = container.get<IAspectManager>(symbols.IAspectManager);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        let liefScope = container.getLifeScope();

        let target = data.target;
        let targetType = data.targetType;

        let className = targetType.name;
        let methods: IPointcut[] = [];
        let decorators = Object.getOwnPropertyDescriptors(targetType.prototype);

        Object.keys(decorators).forEach(name => {
            if (name === 'constructor') {
                return;
            }
            methods.push({
                name: name,
                fullName: `${className}.${name}`,
                descriptor: decorators[name]
            });
        });

        let allmethods = getParamerterNames(targetType);
        Object.keys(allmethods).forEach(name => {
            if (name === 'constructor') {
                return;
            }
            if (isUndefined(decorators[name])) {
                methods.push({
                    name: name,
                    fullName: `${className}.${name}`
                });
            }
        });


        methods.forEach(pointcut => {
            let fullName = pointcut.fullName;
            let methodName = pointcut.name;
            let provJoinpoint: Joinpoint = target['_cache_JoinPoint'];
            let advices = aspectMgr.getAdvices(fullName);
            if (advices && pointcut) {
                let methodAdapter = (propertyMethod: Function) => {

                    return (...args: any[]) => {
                        let joinPoint = container.resolve(Joinpoint, Provider.create('options', {
                            name: methodName,
                            fullName: fullName,
                            provJoinpoint: provJoinpoint,
                            annotations: provJoinpoint ? null : liefScope.getMethodMetadatas(targetType, methodName),
                            params: liefScope.getMethodParameters(targetType, target, methodName),
                            args: args,
                            target: target,
                            targetType: targetType
                        }));
                        let val;
                        let adviceAction = (advicer: Advicer, state: JoinpointState, returnValue?: any, throwError?: any) => {
                            joinPoint.state = state;
                            joinPoint.advicer = advicer;
                            joinPoint.returning = returnValue;
                            joinPoint.throwing = throwError;

                            let providers = [];

                            providers.push(Provider.createExtends(Joinpoint, joinPoint, (inst, provider) => {
                                inst._cache_JoinPoint = provider.resolve(container);
                            }));

                            let metadata: any = advicer.advice;

                            if (!isUndefined(returnValue) && metadata.args) {
                                providers.push(Provider.create(metadata.args, args))
                            }

                            if (metadata.annotationArgName) {
                                providers.push(Provider.create(
                                    metadata.annotationArgName,
                                    () => {
                                        let curj = joinPoint;
                                        let annotations = curj.annotations;
                                        while (!annotations && joinPoint.provJoinpoint) {
                                            curj = joinPoint.provJoinpoint;
                                            if (curj && curj.annotations) {
                                                annotations = curj.annotations;
                                                break;
                                            }
                                        }

                                        if (isArray(annotations)) {
                                            if (metadata.annotation) {
                                                let d: string = metadata.annotation;
                                                d = /^@/.test(d) ? d : `@${d}`;
                                                return annotations.filter(a => a.decorator === d);
                                            }
                                            return annotations;
                                        } else {
                                            return [];
                                        }
                                    }
                                ));
                            }

                            if (!isUndefined(returnValue) && metadata.returning) {
                                providers.push(Provider.create(metadata.returning, returnValue))
                            }

                            if (throwError && metadata.throwing) {
                                providers.push(Provider.create(metadata.throwing, throwError));
                            }

                            return access.syncInvoke<any>(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);

                        };


                        let asBefore = (propertyKeys: string[], state: JoinpointState) => {

                            propertyKeys.forEach(propertyKey => {
                                let canModify = ['Around', 'Pointcut'].indexOf(propertyKey) >= 0;
                                advices[propertyKey].forEach((advicer: Advicer) => {
                                    let retargs = adviceAction(advicer, state) as any[];
                                    if (canModify && isArray(retargs)) {
                                        args = retargs;
                                    }
                                });
                            });

                            return args;
                        }

                        let asResult = (propertyKeys: string[], state: JoinpointState, val, throwError?: any) => {
                            if (isPromise(val)) {
                                propertyKeys.forEach(propertyKey => {
                                    let hasReturn = ['Around', 'AfterReturning'].indexOf(propertyKey) >= 0;
                                    advices[propertyKey].forEach((advicer: Advicer) => {
                                        val = val.then((value) => {
                                            let retval = adviceAction(advicer, state, hasReturn ? value : undefined, throwError);
                                            if (isPromise(retval)) {
                                                return retval.then(val => {
                                                    if (hasReturn && !isUndefined(val)) {
                                                        return val
                                                    } else {
                                                        return value;
                                                    }
                                                });
                                            } else {
                                                if (hasReturn && !isUndefined(retval)) {
                                                    return retval
                                                } else {
                                                    return value;
                                                }
                                            }
                                        });
                                    });
                                });
                            } else if (isObservable(val)) {
                                propertyKeys.forEach(propertyKey => {
                                    let hasReturn = ['Around', 'AfterReturning'].indexOf(propertyKey) >= 0;
                                    advices[propertyKey].forEach((advicer: Advicer) => {
                                        if (isFunction(val.flatMap) && isFunction(val.map)) {
                                            val = val.flatMap((value) => {
                                                let retval = adviceAction(advicer, state, hasReturn ? value : undefined, throwError);
                                                if (isPromise(retval)) {
                                                    return retval.then(val => {
                                                        if (hasReturn && !isUndefined(val)) {
                                                            return val
                                                        } else {
                                                            return value;
                                                        }
                                                    });
                                                } else if (isObservable(retval)) {
                                                    return retval.map(val => {
                                                        if (hasReturn && !isUndefined(val)) {
                                                            return val
                                                        } else {
                                                            return value;
                                                        }
                                                    });
                                                } else {
                                                    if (hasReturn && !isUndefined(retval)) {
                                                        return retval
                                                    } else {
                                                        return value;
                                                    }
                                                }
                                            });
                                        }
                                    });
                                });
                            } else {
                                propertyKeys.forEach(propertyKey => {
                                    let hasReturn = ['Around', 'AfterReturning'].indexOf(propertyKey) >= 0;
                                    advices[propertyKey].forEach((advicer: Advicer) => {
                                        let retval = adviceAction(advicer, state, hasReturn ? val : undefined, throwError);
                                        if (hasReturn && !isUndefined(retval)) {
                                            val = retval
                                        }
                                    });
                                });
                            }
                            return val;
                        }

                        args = asBefore(['Around', 'Before'], JoinpointState.Before);
                        args = asBefore(['Pointcut'], JoinpointState.Pointcut);
                        let exeErr;
                        try {
                            val = propertyMethod(...args);
                        } catch (err) {
                            exeErr = err;
                        }

                        asResult(['Around', 'After'], JoinpointState.After, val);
                        if (exeErr) {
                            asResult(['Around', 'AfterThrowing'], JoinpointState.AfterThrowing, val, exeErr);
                        } else {
                            val = asResult(['Around', 'AfterReturning'], JoinpointState.AfterReturning, val);
                            return val;
                        }
                    };
                }
                if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                    if (pointcut.descriptor.get) {
                        let getMethod = pointcut.descriptor.get.bind(target);
                        pointcut.descriptor.get = methodAdapter(getMethod);
                    }
                    if (pointcut.descriptor.set) {
                        let setMethod = pointcut.descriptor.set.bind(target);
                        pointcut.descriptor.set = methodAdapter(setMethod);
                    }
                    Object.defineProperty(target, methodName, pointcut.descriptor);
                } else if (isFunction(target[methodName])) {
                    let propertyMethod = target[methodName].bind(target);
                    target[methodName] = methodAdapter(propertyMethod);
                }
            }
        });
    }
}
