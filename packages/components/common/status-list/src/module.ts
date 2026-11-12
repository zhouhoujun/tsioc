import { Module } from '@tsdi/ioc';
import { StatusListComponent } from './status-list';

@Module({
    declarations: [StatusListComponent],
    exports: [StatusListComponent]
})
export class StatusListModule {}
