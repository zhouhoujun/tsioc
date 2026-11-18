import { Module } from '@tsdi/ioc';
import { ScrollbarModule } from '../../scrollbar';
import { ListComponent } from './list';

@Module({
    imports: [ScrollbarModule],
    declarations: [ListComponent],
    exports: [ListComponent]
})
export class ListModule {}
