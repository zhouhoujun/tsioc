import { CompositeHandle, AnnoationContext } from '../core';
import { ResolveRunnableHandle, RunBootHandle, ModuleBuildScope } from '../builder';


export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildScope, true)
            .use(ResolveRunnableHandle, true)
            .use(RunBootHandle);
    }
}
