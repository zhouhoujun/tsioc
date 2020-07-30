import { IocContext, IocCompositeAction } from './IocAction';
import * as ra from './runtime-actions';
import { RegContext, InitReflectAction } from './IocRegAction';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCompositeAction<T>}
 */
export class LifeScope<T extends IocContext> extends IocCompositeAction<T> {

}


/**
 * register life scope.
 *
 * @export
 * @class RegisterLifeScope
 * @extends {IocRegScope<T>}
 * @template T
 */
export class RegisterLifeScope<T extends RegContext = RegContext> extends IocCompositeAction<T> {

    register(ctx: T, next?: () => void) {
        this.execute(ctx, next);
    }

}

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<ra.RuntimeContext> {

    execute(ctx: ra.RuntimeContext, next?: () => void): void {
        if (!ctx.target) {
            super.execute(ctx, next);
        }
        // after all clean.
        ctx.destroy();
    }

    setup() {
        this.actInjector
            .regAction(ra.RuntimeDecorAction)
            .regAction(ra.RuntimeParamScope);

        this.use(InitReflectAction)
            .use(ra.IocGetCacheAction)
            .use(ra.CtorArgsAction)
            .use(ra.BeforeCtorScope)
            .use(ra.CreateInstanceAction)
            .use(ra.AfterCtorScope)
            .use(ra.RuntimePropScope)
            .use(ra.RuntimeMthScope)
            .use(ra.RuntimeAnnoScope);

    }

}
