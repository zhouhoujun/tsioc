import { ExtendsProvider, GlobalRegisterAction, RegisterActionContext } from '@ts-ioc/ioc';


/**
 * extends instance action.
 *
 * @export
 * @class ExetndsInstanceAction
 * @extends {GlobalRegisterAction}
 */
export class ExetndsInstanceAction extends GlobalRegisterAction {

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
