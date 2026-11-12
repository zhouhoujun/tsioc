import { Module } from '@tsdi/ioc';
import { BaseComponentsModule } from '../../src/components';
import { TabBarModule } from '../../tab-bar/src/module';
import { TabsComponent } from './tabs';

/**
 * Complex component entry point (`@tsdi/components/common/tabs`). Basic
 * renderer-neutral components stay in the root index/module; tabs is opt-in so
 * hosts that never render panes do not pay for it or its tab-bar dependency.
 */
@Module({
    imports: [BaseComponentsModule, TabBarModule],
    declarations: [TabsComponent],
    exports: [TabsComponent]
})
export class TabsModule {}
