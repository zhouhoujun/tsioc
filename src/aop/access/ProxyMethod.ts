import { NonePointcut, Provider, Injectable, Singleton, Inject } from '../../core/index';
import { Advicer, Advices } from '../advices/index';
import { JoinpointState, IPointcut } from '../joinpoints/index';
import { Joinpoint } from '../joinpoints/index';
import { IContainer } from '../../IContainer';
import { IAdvisor } from '../IAdvisor';
import { isFunction, isUndefined, isArray, isPromise, isObservable, symbols } from '../../utils/index';
import { Type } from '../../types';
import { LifeScope } from '../../LifeScope';
import { IProxyMethod } from './IProxyMethod';
import { IMethodAccessor } from '../../IMethodAccessor';

@NonePointcut()
// @Singleton(symbols.IProxyMethod)
export class ProxyMethod implements IProxyMethod {
    constructor(private container: IContainer) {

    }

    _aspectMgr: IAdvisor;
    get aspectMgr(): IAdvisor {
        if (!this._aspectMgr) {
            this._aspectMgr = this.container.get<IAdvisor>(symbols.IAdvisor);
        }
        return this._aspectMgr;
    }

    _liefScope: LifeScope;
    get liefScope(): LifeScope {
        if (!this._liefScope) {
            this._liefScope = this.container.getLifeScope();
        }
        return this._liefScope;
    }

    proceed(target: any, targetType: Type<any>, pointcut: IPointcut, provJoinpoint?: Joinpoint) {

        let aspectMgr = this.aspectMgr;
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;

        let advices = aspectMgr.getAdvices(fullName);
        if (advices && pointcut) {
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                if (pointcut.descriptor.get) {
                    let getMethod = pointcut.descriptor.get.bind(target);
                    pointcut.descriptor.get = this.proxy(getMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                if (pointcut.descriptor.set) {
                    let setMethod = pointcut.descriptor.set.bind(target);
                    pointcut.descriptor.set = this.proxy(setMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                Object.defineProperty(target, methodName, pointcut.descriptor);
            } else if (isFunction(target[methodName])) {
                let propertyMethod = target[methodName].bind(target);
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint);
            }
        }
    }

    proxy(propertyMethod: Function, advices: Advices, target: any, targetType: Type<any>, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        let aspectMgr = this.aspectMgr;
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let liefScope = this.liefScope;
        let container = this.container;

        return (...args: any[]) => {
            let joinPoint = this.container.resolve(Joinpoint, Provider.create('options', {
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

                return this.container.syncInvoke<any>(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);

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
        }
    }
}
