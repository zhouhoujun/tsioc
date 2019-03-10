import { ExtendsProvider, IocRegisterAction, RegisterActionContext } from '@ts-ioc/ioc';


/**
 * extends instance action.
 *
 * @export
 * @class ExetndsInstanceAction
 * @extends {IocRegisterAction}
 */
export class ExetndsInstanceAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void): void {
        // aspect class do nothing.
        if (ctx.providers && ctx.providers.length) {
            ctx.providers.forEach(p => {
                if (p && p instanceof ExtendsProvider) {
                    p.extends(ctx.target);
                }
            });
        }
        next();
    }
}
