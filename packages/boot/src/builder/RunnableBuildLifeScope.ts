import { CompositeHandle, AnnoationContext } from '../core';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';
import { ResolveRunnableHandle } from './ResolveRunnableHandle';
import { RunBootHandle } from './RunBootHandle';


export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(RegisterModuleScope, true)
            .use(ModuleBuildScope, true)
            .use(ResolveRunnableHandle, true)
            .use(RunBootHandle);
    }
}
