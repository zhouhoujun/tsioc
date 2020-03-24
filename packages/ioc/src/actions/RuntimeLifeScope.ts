import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';
import { RuntimeContext } from './runtime/RuntimeActionContext';
import { RuntimeDecorAction } from './runtime/RuntimeDecoratorAction';
import { RuntimeParamScope } from './runtime/RuntimeParamScope';
import { IocGetCacheAction } from './runtime/IocGetCacheAction';
import { CtorArgsAction } from './runtime/ConstructorArgsAction';
import { BeforeCtorScope } from './runtime/IocBeforeConstructorScope';
import { CreateInstanceAction } from './runtime/CreateInstanceAction';
import { AfterCtorScope } from './runtime/IocAfterConstructorScope';
import { RuntimePropScope } from './runtime/RuntimePropertyScope';
import { RuntimeMthScope } from './runtime/RuntimeMethodScope';
import { RuntimeAnnoScope } from './runtime/RuntimeAnnoationScope';

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
