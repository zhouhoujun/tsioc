
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
                                joinPoint.state = JoinpointState.Before;
                                access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                    value: joinPoint,
                                    index: 0
                                });
                            }
                            if (mpt.advice.adviceName === 'Around') {
                                joinPoint.args = args;
                                joinPoint.state = JoinpointState.Before;
                                access.syncInvoke(type, mpt.advice.propertyKey, aspect, {
                                    value: joinPoint,
                                    index: 0
                                });
                            }

                            let adviceAction = (state: JoinpointState, isAsync: boolean, returnValue?: any, throwError?: any) => {
                                joinPoint.state = state;
                                if (!isUndefined(returnValue)) {
                                    joinPoint.returning = returnValue;
                                }
                                if (!isUndefined(throwError)) {
                                    joinPoint.throwing = throwError;
                                }
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

                            let asResult = (state: JoinpointState, val, hasReturn?: boolean, throwError?: any) => {
                                if (isPromise(val)) {
                                    val.then(async (value) => {
                                        await adviceAction(state, true, hasReturn ? val : undefined, throwError);
                                        return value;
                                    });
                                } else {
                                    adviceAction(state, false, hasReturn ? val : undefined, throwError)
                                }
                            }

                            try {
                                val = propertyMethod(...args);
                                asResult(JoinpointState.After, val);

                            } catch (err) {
                                if (mpt.advice.adviceName === 'AfterThrowing'
                                    || mpt.advice.adviceName === 'Around'
                                    || mpt.advice.adviceName === 'After') {
                                    asResult(JoinpointState.AfterThrowing, val, false, err);
                                }

                                throw err;
                            }

                            if (mpt.advice.adviceName === 'AfterReturning' || mpt.advice.adviceName === 'Around') {
                                asResult(JoinpointState.AfterReturning, val, true);
                            }
                            return val;
                        });
                    }
                }
            });
        });
    }
}
