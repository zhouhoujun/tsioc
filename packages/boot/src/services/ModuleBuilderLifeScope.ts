import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import { ModuleBuildScope } from '../builder';

@Singleton
@Autorun('setup')
export class ModuleBuilderLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildScope, true);
    }
}
