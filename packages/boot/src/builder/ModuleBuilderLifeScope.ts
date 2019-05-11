import { CompositeHandle, AnnoationContext } from '../core';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';


export class ModuleBuilderLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(RegisterModuleScope, true)
            .use(ModuleBuildScope, true);
    }
}
