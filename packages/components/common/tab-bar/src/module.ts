import { Module } from '@tsdi/ioc';
import { TabBarComponent } from './tab-bar';
import { TabContextMenuComponent } from './tab-context-menu';

/**
 * Complex component entry point (`@tsdi/components/common/tab-bar`). Hosts
 * that only paint the strip import this module; panes use `tabs`.
 */
@Module({
    declarations: [TabBarComponent, TabContextMenuComponent],
    exports: [TabBarComponent, TabContextMenuComponent]
})
export class TabBarModule {}
