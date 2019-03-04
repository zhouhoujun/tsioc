import { IocAction, IocActionContext } from './Action';
import { isUndefined } from '../utils';
import { hasOwnClassMetadata } from '../factories';
import { Singleton } from '../decorators';
import { DecoratorRegisterer } from '../services';

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocAction}
 */
export class GetSingletionAction extends IocAction {

    execute(ctx: IocActionContext, next: () => void): void {
        if (isUndefined(ctx.targetReflect.singleton)) {
            let singleton = hasOwnClassMetadata(Singleton, ctx.targetType);
            let metadata = this.container.get(DecoratorRegisterer).findClassMetadata(ctx.targetType, m => m.singleton === true);
            singleton = !!metadata;
            ctx.targetReflect.singleton = singleton;
        }
        if (ctx.tokenKey && ctx.target && (ctx.singleton || ctx.targetReflect.singleton)) {
            if (this.container.has(ctx.tokenKey)) {
                ctx.target = this.container.resolve(ctx.tokenKey);
                return;
            }
        }
        next();
    }
}

