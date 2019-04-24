import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import { ResolveRunnableHandle, RunBootHandle, ModuleBuildScope } from '../handles';

@Singleton
@Autorun('setup')
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildScope)
            .use(ResolveRunnableHandle)
            .use(RunBootHandle);
    }
}
