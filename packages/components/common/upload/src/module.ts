import { Module } from '@tsdi/ioc';
import { UploadComponent } from './upload';

@Module({
    declarations: [UploadComponent],
    exports: [UploadComponent]
})
export class UploadModule {}
