import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from './BuildHandles';
import { AnnoationContext } from '../AnnoationContext';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';
import { ResolveRunnableScope } from './ResolveRunnableScope';
import { RunBootHandle } from './RunBootHandle';


export class RunnableBuildLifeScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegisterModuleScope)
            .use(ModuleBuildScope)
            .use(ResolveRunnableScope)
            .use(RunBootHandle);
    }
}
