
import { IContainer, ActionData, ActionComposite, getParamerterNames, isUndefined, getClassName, lang } from '@ts-ioc/core';
import { AopActions } from './AopActions';
import { Aspect, Advice } from '../decorators/index';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AroundMetadata } from '../metadatas/index'
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints/index';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { IProxyMethod, ProxyMethod, ProxyMethodToken } from '../access/index';


/**
 * bind pointcut action data.
 *
 * @export
 * @interface BindPointcutActionData
 * @extends {ActionData<Joinpoint>}
 */
export interface BindPointcutActionData extends ActionData<Joinpoint> {
}

/**
 * bind method pointcut action.
 *
 * @export
 * @class BindMethodPointcutAction
 * @extends {ActionComposite}
 */
export class BindMethodPointcutAction extends ActionComposite {

    constructor() {
        super(AopActions.bindMethodPointcut);
    }

    protected working(container: IContainer, data: BindPointcutActionData) {
        // aspect class do nothing.
        if (!data.target || !isValideAspectTarget(data.targetType)) {
            return;
        }

        let proxy = container.get(ProxyMethodToken);

        let target = data.target;
        let targetType = data.targetType;

        let className = getClassName(targetType);
        let methods: IPointcut[] = [];
        let decorators = Object.getOwnPropertyDescriptors(targetType.prototype);

        lang.forIn(decorators, (item, name: string) => {
            if (name === 'constructor') {
                return;
            }
            methods.push({
                name: name,
                fullName: `${className}.${name}`,
                descriptor: item
            });
        });

        let allmethods = getParamerterNames(targetType);
        lang.forIn(allmethods, (item, name: string) => {
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
