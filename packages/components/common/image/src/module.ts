import { Module } from '@tsdi/ioc';
import { ImageComponent } from './image';

@Module({
    declarations: [ImageComponent],
    exports: [ImageComponent]
})
export class ImageModule {}
