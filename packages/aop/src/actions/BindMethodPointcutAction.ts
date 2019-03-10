import { IPointcut } from '../joinpoints';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { ProxyMethodToken } from '../access';
import { IocRegisterAction, RegisterActionContext, lang, getParamerterNames, isUndefined } from '@ts-ioc/ioc';

/**
 * bind method pointcut action.
 *
 * @export
 * @class BindMethodPointcutAction
 * @extends {IocRegisterAction}
 */
export class BindMethodPointcutAction extends IocRegisterAction {

    /**
     * execute bind method pointcut action.
     *
     * @param {RegisterActionContext} ctx
     * @param {() => void} next
     * @returns {void}
     * @memberof BindMethodPointcutAction
     */
    execute(ctx: RegisterActionContext, next: () => void): void {
        // aspect class do nothing.
        if (!ctx.target || !isValideAspectTarget(ctx.targetType)) {
            return next();
        }
        if (!this.container.hasRegister(ProxyMethodToken)) {
            return next();
        }

        let proxy = this.container.get(ProxyMethodToken);

        let target = ctx.target;
        let targetType = ctx.targetType;

        let className = lang.getClassName(targetType);
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

        next();
    }
}
