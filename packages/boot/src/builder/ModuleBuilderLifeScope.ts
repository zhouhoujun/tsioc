import { CompositeHandle, AnnoationContext } from '../core';
import { ModuleBuildScope } from '../builder';


export class ModuleBuilderLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildScope, true);
    }
}
