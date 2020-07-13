import { IocContext, IocCompositeAction } from './IocAction';
import {
    RuntimeDecorAction, RuntimeParamScope, IocGetCacheAction, CtorArgsAction,
    BeforeCtorScope, CreateInstanceAction, AfterCtorScope, RuntimePropScope,
    RuntimeMthScope, RuntimeAnnoScope, RuntimeContext
} from './runtime-actions';
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
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeContext> {

    execute(ctx: RuntimeContext, next?: () => void): void {
        if (!ctx.target) {
            super.execute(ctx, next);
        }
        // after all clean.
        ctx.destroy();
    }

    setup() {
        this.actInjector
            .regAction(RuntimeDecorAction)
            .regAction(RuntimeParamScope);

        this.use(InitReflectAction)
            .use(IocGetCacheAction)
            .use(CtorArgsAction)
            .use(BeforeCtorScope)
            .use(CreateInstanceAction)
            .use(AfterCtorScope)
            .use(RuntimePropScope)
            .use(RuntimeMthScope)
            .use(RuntimeAnnoScope);

    }

}
