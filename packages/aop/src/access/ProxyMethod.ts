import {
    Provider, Singleton, Inject, Type,
    isFunction, DecoratorRegisterer, RuntimeLifeScope
} from '@ts-ioc/ioc';
import { Advices } from '../advices';
import { JoinpointState, IPointcut } from '../joinpoints';
import { Joinpoint } from '../joinpoints';
import { IAdvisor, AdvisorToken } from '../IAdvisor';
import { IProxyMethod, ProxyMethodToken } from './IProxyMethod';
import { AdvisorChainFactoryToken } from './IAdvisorChainFactory';
import { NonePointcut } from '../decorators/NonePointcut';
import { ContainerToken, IContainer } from '@ts-ioc/core';

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

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    private _advisor: IAdvisor;
    get advisor(): IAdvisor {
        if (!this._advisor) {
            this._advisor = this.container.get(AdvisorToken);
        }
        return this._advisor;
    }

    private _lifeScope: RuntimeLifeScope;
    get lifeScope(): RuntimeLifeScope {
        if (!this._lifeScope) {
            this._lifeScope = this.container.get(RuntimeLifeScope);
        }
        return this._lifeScope;
    }

    private _decorReg: DecoratorRegisterer;
    get decorRegisterer(): DecoratorRegisterer {
        if (!this._decorReg) {
            this._decorReg = this.container.get(DecoratorRegisterer);
        }
        return this._decorReg;
    }

    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type<any>} targetType
     * @param {IPointcut} pointcut
     * @param {Joinpoint} [provJoinpoint]
     * @memberof ProxyMethod
     */
    proceed(target: any, targetType: Type<any>, pointcut: IPointcut, provJoinpoint?: Joinpoint) {

        let aspectMgr = this.advisor;
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
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let container = this.container;
        let lifeScope = this.lifeScope;
        return (...args: any[]) => {
            let joinPoint = this.container.resolve(Joinpoint, Provider.create('options', {
                name: methodName,
                fullName: fullName,
                provJoinpoint: provJoinpoint,
                annotations: provJoinpoint ? null : this.decorRegisterer.filterMethodMetadata(targetType, methodName),
                params: lifeScope.getMethodParameters(this.container, targetType, target, methodName),
                args: args,
                target: target,
                targetType: targetType
            }));

            let adChain = container.resolve(AdvisorChainFactoryToken, { container: container, advisor: this.advisor, advices: advices });
            adChain.invoaction(joinPoint, JoinpointState.Before);
            adChain.invoaction(joinPoint, JoinpointState.Pointcut);
            let val, exeErr;
            try {
                val = propertyMethod(...joinPoint.args);
            } catch (err) {
                exeErr = err;
            }

            adChain.invoaction(joinPoint, JoinpointState.After, val);
            if (exeErr) {
                adChain.invoaction(joinPoint, JoinpointState.AfterThrowing, exeErr);
            } else {
                adChain.invoaction(joinPoint, JoinpointState.AfterReturning, val);
                return joinPoint.returning;
            }
        }
    }
}
