import { Module } from '@tsdi/ioc';
import { GridLayoutComponent, GridItemComponent } from './grid-layout';

@Module({
    declarations: [GridLayoutComponent, GridItemComponent],
    exports: [GridLayoutComponent, GridItemComponent]
})
export class GridLayoutModule {}
