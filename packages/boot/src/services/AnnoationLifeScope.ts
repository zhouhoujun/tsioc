import { CompositeHandle, AnnoationContext, MetaAccessorHandle } from '../handles';
import { Singleton, Autorun, Inject } from '@ts-ioc/ioc';
import { ContainerToken, IContainer } from '@ts-ioc/core';

@Singleton
@Autorun('setup')
export class AnnoationLifeScope extends CompositeHandle<AnnoationContext> {
    @Inject(ContainerToken)
    private container: IContainer;

    setup() {

        this.use(MetaAccessorHandle);
    }
}
