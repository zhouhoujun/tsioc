
import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import { ModuleBuildHandle } from '../handles';

@Singleton
@Autorun('setup')
export class ModuleBuilderLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildHandle);
    }
}
