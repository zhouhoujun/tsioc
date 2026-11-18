import { Module } from '@tsdi/ioc';
import { PaginationComponent } from './pagination';

@Module({
    declarations: [PaginationComponent],
    exports: [PaginationComponent]
})
export class PaginationModule {}
