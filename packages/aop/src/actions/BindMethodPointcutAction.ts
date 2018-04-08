
import { IContainer, ActionData, ActionComposite, getParamerterNames, symbols, isUndefined } from '@tsioc/core';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AroundMetadata } from '../metadatas/index'
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints/index';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { IProxyMethod, ProxyMethod } from '../access/index';

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

        let proxy = container.get<IProxyMethod>(symbols.IProxyMethod);

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
            proxy.proceed(target, targetType, pointcut, target['_cache_JoinPoint']);
        });
    }
}
