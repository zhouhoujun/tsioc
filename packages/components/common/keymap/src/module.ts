import { Module } from '@tsdi/ioc';
import { KeymapPanelComponent } from './keymap-panel';

@Module({
    declarations: [KeymapPanelComponent],
    exports: [KeymapPanelComponent]
})
export class KeymapPanelModule {}

/** Short entry-point alias: `@tsdi/components/common/keymap` exports both. */
export const KeymapModule = KeymapPanelModule;
