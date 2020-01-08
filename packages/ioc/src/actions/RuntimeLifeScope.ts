import { RegisterLifeScope } from './RegisterLifeScope';
import { InitReflectAction } from './InitReflectAction';
import { RuntimeActionContext } from './runtime/RuntimeActionContext';
import { RuntimeDecoratorAction } from './runtime/RuntimeDecoratorAction';
import { RuntimeParamScope } from './runtime/RuntimeParamScope';
// import { GetSingletionAction } from './runtime/GetSingletionAction';
import { IocGetCacheAction } from './runtime/IocGetCacheAction';
import { ConstructorArgsAction } from './runtime/ConstructorArgsAction';
import { IocBeforeConstructorScope } from './runtime/IocBeforeConstructorScope';
import { CreateInstanceAction } from './runtime/CreateInstanceAction';
import { IocAfterConstructorScope } from './runtime/IocAfterConstructorScope';
import { RuntimePropertyScope } from './runtime/RuntimePropertyScope';
import { RuntimeMethodScope } from './runtime/RuntimeMethodScope';
import { RuntimeAnnoationScope } from './runtime/RuntimeAnnoationScope';

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeActionContext> {

    execute(ctx: RuntimeActionContext, next?: () => void): void {
        if (!ctx.target) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.actInjector
            .regAction(RuntimeDecoratorAction)
            .regAction(RuntimeParamScope);

        this.use(InitReflectAction)
            // .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ConstructorArgsAction)
            .use(IocBeforeConstructorScope)
            .use(CreateInstanceAction)
            .use(IocAfterConstructorScope)
            .use(RuntimePropertyScope)
            .use(RuntimeMethodScope)
            .use(RuntimeAnnoationScope);

    }

}
