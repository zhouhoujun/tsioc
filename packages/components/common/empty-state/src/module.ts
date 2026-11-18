import { Module } from '@tsdi/ioc';
import { ButtonModule } from '../../button';
import { IconModule } from '../../icon';
import { EmptyStateComponent } from './empty-state';

@Module({
    imports: [ButtonModule, IconModule],
    declarations: [EmptyStateComponent],
    exports: [EmptyStateComponent]
})
export class EmptyStateModule {}
