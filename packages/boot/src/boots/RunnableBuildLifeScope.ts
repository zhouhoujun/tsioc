import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { IAnnoationContext } from '../AnnoationContext';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';
import { ResolveRunnableScope } from './ResolveRunnableScope';
import { StartupBootHandle } from './StartupBootHandle';


export class RunnableBuildLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegisterModuleScope)
            .use(ModuleBuildScope)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}
