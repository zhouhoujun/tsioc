import { Module } from '@tsdi/ioc';
import { ScrollbarComponent } from './scrollbar';

@Module({
    declarations: [ScrollbarComponent],
    exports: [ScrollbarComponent]
})
export class ScrollbarModule {}
