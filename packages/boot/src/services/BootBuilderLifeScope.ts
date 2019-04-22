
import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import { BootBuildScope } from '../handles';

@Singleton
@Autorun('setup')
export class BootBuilderLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(BootBuildScope);
    }
}
