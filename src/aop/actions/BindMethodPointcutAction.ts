
import { DecoratorType, ActionData, ActionComposite, hasClassMetadata, hasMethodMetadata, getMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../IAspectManager';
import { isClass, isArray, symbols, isPromise, isFunction, isUndefined } from '../../utils/index';
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
        let aspectMgr = container.get<IAspectManager>(symbols.IAspectManager);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        let liefScope = container.getLifeScope();

        let className = data.targetType.name;
        let methods: IPointcut[] = [];
        let decorators = Object.getOwnPropertyDescriptors(data.targetType.prototype);
        for (let name in decorators) {
            if (name && name !== 'constructor') {
                methods.push({
                    name: name,
                    fullName: `${className}.${name}`,
                    descriptor: decorators[name]
                });
            }
        }

        let target = data.target;
        let targetType = data.targetType;

        methods.forEach(pointcut => {
            let fullName = pointcut.fullName;
            let methodName = pointcut.name;
            let provJoinpoint: Joinpoint = target['_cache_JoinPoint'];
            let advices = aspectMgr.getAdvices(fullName);
            if (advices && pointcut.descriptor) {
                let methodAdapter = (propertyMethod: Function) => {

                    return (...args: any[]) => {
                        let joinPoint = container.resolve(Joinpoint, {
                            options: {
                                name: methodName,
                                fullName: fullName,
                                provJoinpoint: provJoinpoint,
                                annotations: provJoinpoint ? null : liefScope.getMethodMetadatas(targetType, methodName),
                                params: liefScope.getMethodParameters(targetType, target, methodName),
                                args: args,
                                target: target,
                                targetType: targetType
                            }
                        });
                        let val;
                        let adviceAction = (advicer: Advicer, state: JoinpointState, isAsync = false, returnValue?: any, throwError?: any) => {
                            joinPoint.state = state;
                            joinPoint.advicer = advicer;
                            joinPoint.returning = returnValue;
                            joinPoint.throwing = throwError;

                            let providers = [];

                            providers.push({
                                type: Joinpoint,
                                value: joinPoint,
                                extendsTarget: (inst) => {
                                    inst._cache_JoinPoint = joinPoint;
                                }
                            } as ParamProvider)

                            let metadata: any = advicer.advice;

                            if (!isUndefined(returnValue) && metadata.args) {
                                providers.push({
                                    value: args,
                                    index: metadata.args
                                } as ParamProvider);
                            }


                            if (metadata.annotationArgName) {
                                providers.push({
                                    value: () => {
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
                                    },
                                    index: metadata.annotationArgName
                                } as ParamProvider);
                            }

                            if (!isUndefined(returnValue) && metadata.returning) {
                                providers.push({
                                    value: returnValue,
                                    index: metadata.returning
                                } as ParamProvider);
                            }

                            if (throwError && metadata.throwing) {
                                providers.push({
                                    value: throwError,
                                    index: metadata.throwing
                                } as ParamProvider);
                            }

                            if (isAsync) {
                                return access.invoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
                            } else {
                                return access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, null, ...providers);
                            }
                        };


                        let asBefore = (propertyKeys: string[], state: JoinpointState) => {

                            propertyKeys.forEach(propertyKey => {
                                let canModify = ['Around', 'Pointcut'].indexOf(propertyKey) >= 0;
                                advices[propertyKey].forEach((advicer: Advicer) => {
                                    let retargs = adviceAction(advicer, state, false) as any[];
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
                            args = asBefore(['Around', 'Before'], JoinpointState.Before);
                            args = asBefore(['Pointcut'], JoinpointState.Pointcut);
                            val = propertyMethod(...args);
                            asResult(['Around'], JoinpointState.After, val);
                            val = asResult(['Around', 'AfterReturning'], JoinpointState.AfterReturning, val);
                            return val;
                        } catch (err) {
                            asResult(['Around', 'AfterThrowing'], JoinpointState.AfterThrowing, val, err);
                            throw err;
                        } finally {
                            asResult(['After'], JoinpointState.After, val);
                        }
                    };
                }
                if (pointcut.descriptor.get || pointcut.descriptor.set) {
                    if (pointcut.descriptor.get) {
                        let getMethod = pointcut.descriptor.get.bind(target);
                        pointcut.descriptor.get = methodAdapter(getMethod);
                    }
                    if (pointcut.descriptor.set) {
                        let setMethod = pointcut.descriptor.set.bind(target);
                        pointcut.descriptor.set = methodAdapter(setMethod);
                    }
                    Object.defineProperty(target, methodName, pointcut.descriptor);
                } else if (isFunction(pointcut.descriptor.value)) {
                    let propertyMethod = target[methodName].bind(target);
                    target[methodName] = methodAdapter(propertyMethod);
                }
            }
        });
    }
}
