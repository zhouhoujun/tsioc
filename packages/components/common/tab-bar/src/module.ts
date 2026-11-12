import { Module } from '@tsdi/ioc';
import { TabBarComponent } from './tab-bar';

/**
 * Complex component entry point (`@tsdi/components/common/tab-bar`). Hosts
 * that only paint the strip import this module; panes use `tabs`.
 */
@Module({
    declarations: [TabBarComponent],
    exports: [TabBarComponent]
})
export class TabBarModule {}
