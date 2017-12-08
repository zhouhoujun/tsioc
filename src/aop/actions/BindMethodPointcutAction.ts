
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
import { Joinpoint } from '../Joinpoint';
import { async } from 'q';


export interface BindPointcutActionData extends ActionData<AdviceMetadata> {
}

export class BindMethodPointcutAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(AopActions.registAspect.toString(), decorName, decorType);
    }

    protected working(container: IContainer, data: BindPointcutActionData) {
        // aspect class do nothing.
        if (Reflect.hasMetadata(Aspect.toString(), data.targetType)) {
            return;
        }
        let aspects = container.get(AspectSet);
        let matcher = container.get<IAdviceMatcher>(symbols.IAdviceMatcher);
        let access = container.get<IMethodAccessor>(symbols.IMethodAccessor);
        aspects.forEach((type, aspect) => {
            let adviceMaps = getMethodMetadata<AdviceMetadata>(Advice, type);
            let matchpoints = matcher.match(adviceMaps, data.targetType, data.target);
            matchpoints.forEach(mpt => {
                if (mpt.name !== 'constructor' && data.target) {
                    let propertyMethod = data.target[mpt.name];
                    if (isFunction(propertyMethod)) {
                        data.target[mpt.name] = ((...args: any[]) => {
                            let val;
                            let joinPoint = {
                                name: mpt.name,
                                fullName: mpt.fullName,
                                target: data.target,
                                targetType: data.targetType
                            } as Joinpoint;
                            if (mpt.advice.adviceName === 'Before') {
                                access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                    value: joinPoint,
                                    index: 0
                                });
                            }
                            if (mpt.advice.adviceName === 'Around') {
                                joinPoint.args = args;
                                access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                    value: joinPoint,
                                    index: 0
                                });
                            }
                            let afterAdvice = (value, isAsync?: boolean) => {
                                if (mpt.advice.adviceName === 'After') {
                                    if (isAsync) {
                                        return access.invoke(type, mpt.advice.propertyKey, aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                    } else {
                                        return access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                    }
                                }

                                if (mpt.advice.adviceName === 'Around') {
                                    joinPoint.returning = value;
                                    if (isAsync) {
                                        return access.invoke(type, mpt.advice.propertyKey, aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                    } else {
                                        return access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                    }
                                }
                                return null;
                            }
                            try {
                                val = propertyMethod(...args);
                                if (mpt.advice.adviceName === 'After') {
                                    if (isPromise(val)) {
                                        val.then(async (value) => {
                                            await afterAdvice(value, true);
                                            return value;
                                        });
                                    } else {
                                        afterAdvice(val)
                                    }
                                }
                            } catch (err) {
                                if (mpt.advice.adviceName === 'AfterThrowing') {
                                    joinPoint.throwing = err;
                                    access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                        value: joinPoint,
                                        index: 0
                                    });
                                }
                                if (isPromise(val)) {
                                    val = val.then(async (value) => {
                                        await afterAdvice(value, true);
                                        return value;
                                    });
                                } else {
                                    afterAdvice(val);
                                }
                                throw err;
                            }
                            if (mpt.advice.adviceName === 'AfterReturning') {
                                if (isPromise(val)) {
                                    val = val.then(async value => {
                                        joinPoint.returning = value;
                                        await access.invoke(type, mpt.advice.propertyKey, aspect, {
                                            value: joinPoint,
                                            index: 0
                                        });
                                        return value
                                    });
                                } else {
                                    joinPoint.returning = val;
                                    access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                        value: joinPoint,
                                        index: 0
                                    });
                                }
                            }
                            return val;
                        }).bind(data.target);
                    }
                }
            });
        });
    }
}
