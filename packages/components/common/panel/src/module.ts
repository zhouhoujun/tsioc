import { Module } from '@tsdi/ioc';
import { PanelComponent } from './panel';

/** Complex component entry point (`@tsdi/components/common/panel`). */
@Module({
    declarations: [PanelComponent],
    exports: [PanelComponent]
})
export class PanelModule {}
