import {
    Singleton, Inject, Type, isFunction, IocContainerToken, IIocContainer,
    MethodAccessorToken
} from '@tsdi/ioc';
import { Advices, AdvicesToken } from '../advices/Advices';
import { IProxyMethod, ProxyMethodToken } from './IProxyMethod';
import { NonePointcut } from '../decorators/NonePointcut';
import { AdvisorChainFactory } from './AdvisorChainFactory';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint, JoinpointOptionToken, JoinpointOption } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/JoinpointState';

/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
@NonePointcut()
@Singleton(ProxyMethodToken)
export class ProxyMethod implements IProxyMethod {

    constructor(@Inject(IocContainerToken) private container: IIocContainer) {

    }

    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type} targetType
     * @param {IPointcut} pointcut
     * @param {Joinpoint} [provJoinpoint]
     * @memberof ProxyMethod
     */
    proceed(target: any, targetType: Type, advices: Advices, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        let methodName = pointcut.name;
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
                Reflect.defineProperty(target, methodName, pointcut.descriptor);
            } else if (isFunction(target[methodName])) {
                let propertyMethod = target[methodName].bind(target);
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint);
            }
        }
    }

    proxy(propertyMethod: Function, advices: Advices, target: any, targetType: Type, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let container = this.container;
        let reflects = container.getTypeReflects();
        return (...args: any[]) => {
            let cuurPrd = container.getInjector(targetType).getInstance(MethodAccessorToken).invokedProvider(target, methodName);
            let joinPoint = container.getInstance(Joinpoint, {
                provide: JoinpointOptionToken,
                useValue: <JoinpointOption>{
                    name: methodName,
                    fullName: fullName,
                    provJoinpoint: provJoinpoint,
                    annotations: provJoinpoint ? null : reflects.getMetadatas(targetType, methodName, 'method'),
                    params: reflects.getParameters(targetType, target, methodName),
                    args: args,
                    target: target,
                    targetType: targetType,
                    originProvider: provJoinpoint ? provJoinpoint.originProvider || provJoinpoint.currProvider : cuurPrd,
                    currProvider: provJoinpoint ? cuurPrd : null
                }
            });

            let adChain = container.getInstance(AdvisorChainFactory, { provide: IocContainerToken, useValue: container }, { provide: AdvicesToken, useValue: advices });

            let val, exeErr;
            try {
                adChain.invoaction(joinPoint, JoinpointState.Before);
                adChain.invoaction(joinPoint, JoinpointState.Pointcut);
                val = propertyMethod(...joinPoint.args);
            } catch (err) {
                exeErr = err;
                adChain.invoaction(joinPoint, JoinpointState.AfterThrowing, exeErr);
                throw exeErr;
            }
            (async () => {
                adChain.invoaction(joinPoint, JoinpointState.After, val);
            })();
            if (!exeErr) {
                adChain.invoaction(joinPoint, JoinpointState.AfterReturning, val);
                return joinPoint.returning;
            }
        }
    }
}
