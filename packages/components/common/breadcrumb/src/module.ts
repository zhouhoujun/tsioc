import { Module } from '@tsdi/ioc';
import { BreadcrumbComponent } from './breadcrumb';

@Module({
    declarations: [BreadcrumbComponent],
    exports: [BreadcrumbComponent]
})
export class BreadcrumbModule {}
