import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { ToolbarComponent } from './toolbar';

@Module({
    imports: [IconModule],
    declarations: [ToolbarComponent],
    exports: [ToolbarComponent]
})
export class ToolbarModule {}
