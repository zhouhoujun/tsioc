import { CompositeHandle, AnnoationContext } from '../core';
import { BootConfigureLoadHandle, ModuleBuildScope, ResolveRunnableHandle, RunBootHandle, BootConfigureRegisterHandle } from '../builder';


export class BootLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(BootConfigureLoadHandle)
            .use(ModuleBuildScope, true)
            .use(BootConfigureRegisterHandle)
            .use(ResolveRunnableHandle, true)
            .use(RunBootHandle);
    }
}
