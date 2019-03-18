import { CompositeHandle, AnnoationContext, MetaAccessorHandle } from '../handles';
import { Singleton, Autorun } from '@ts-ioc/ioc';

@Singleton
@Autorun('setup')
export class AnnoationLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(MetaAccessorHandle);
    }
}
