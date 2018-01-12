
import { DecoratorType, ActionData, ActionComposite, getMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../AspectManager';
import { isClass, symbols, isPromise, isFunction, isUndefined } from '../../utils/index';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AroundMetadata } from '../metadatas/index'
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Joinpoint, JoinpointState, IJoinpoint } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { Advices, Advicer } from '../Advices';
import { IPointcut } from '../IPointcut';
import { Token } from '../../types';
import { ParamProvider } from '../../ParamProvider';
import { isArray } from '../../browser';

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
        let aspects = container.get<IAspectManager>(symbols.IAspectManager);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);

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

        methods.forEach(pointcut => {
            let fullName = pointcut.fullName;
            let methodName = pointcut.name;
            let advices = aspects.getAdvices(fullName);

            if (advices && pointcut.descriptor) {
                let methodAdapter = (propertyMethod: Function) => {
                    return (...args: any[]) => {
                        let val;

                        let adviceAction = (advicer: Advicer, state: JoinpointState, isAsync = false, returnValue?: any, throwError?: any) => {
                            let joinPoint = {
                                name: methodName,
                                fullName: fullName,
                                state: state,
                                target: target,
                                targetType: data.targetType
                            } as IJoinpoint;
                            let index = '';
                            let value;
                            let providers = [];


                            let metadata: any = advicer.advice;

                            if (metadata.args) {
                                providers.push({
                                    value: args,
                                    index: metadata.args
                                } as ParamProvider);
                            }
                            if (metadata.returning) {
                                providers.push({
                                    value: returnValue,
                                    index: metadata.returning
                                } as ParamProvider);
                            } else if (metadata.throwing) {
                                providers.push({
                                    value: throwError,
                                    index: metadata.throwing
                                } as ParamProvider);
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

                            providers.push({
                                type: Joinpoint,
                                value: container.resolve(Joinpoint, { json: joinPoint })
                            } as ParamProvider)


                            if (isAsync) {
                                return access.invoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers);
                            } else {
                                return access.syncInvoke(advicer.aspectType, advicer.advice.propertyKey, undefined, ...providers);
                            }
                        };


                        let asBefore = (propertyKeys: string[], state: JoinpointState, args: any[]) => {

                            propertyKeys.forEach(propertyKey => {
                                let canModify = ['Around', 'Pointcut'].indexOf(propertyKey) >= 0;
                                advices[propertyKey].forEach((advicer: Advicer) => {
                                    let retargs = adviceAction(advicer, state, false, canModify ? args : undefined) as any[];
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
                            args = asBefore(['Around', 'Before'], JoinpointState.Before, args);
                            args = asBefore(['Pointcut'], JoinpointState.Pointcut, args);
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
                } else {
                    let propertyMethod = target[methodName].bind(target);
                    target[methodName] = methodAdapter(propertyMethod);
                }
            }
        });
    }
}
