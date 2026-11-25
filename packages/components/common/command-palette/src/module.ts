import { Module } from '@tsdi/ioc';
import { SearchListModule } from '../../search-list/src/module';
import { CommandPaletteComponent } from './command-palette';

@Module({
    imports: [SearchListModule],
    declarations: [CommandPaletteComponent],
    exports: [CommandPaletteComponent]
})
export class CommandPaletteModule {}
