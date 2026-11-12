import { Module } from '@tsdi/ioc';
import { KeymapPanelComponent } from './keymap-panel';

@Module({
    declarations: [KeymapPanelComponent],
    exports: [KeymapPanelComponent]
})
export class KeymapPanelModule {}
