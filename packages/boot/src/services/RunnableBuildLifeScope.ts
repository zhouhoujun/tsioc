import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import { ResolveRunnableHandle, RunBootHandle, ModuleBuildScope } from '../builder';

@Singleton
@Autorun('setup')
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildScope, true)
            .use(ResolveRunnableHandle, true)
            .use(RunBootHandle);
    }
}
