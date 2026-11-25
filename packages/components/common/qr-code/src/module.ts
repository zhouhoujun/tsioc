import { Module } from '@tsdi/ioc';
import { QrCodeComponent } from './qr-code';

@Module({
    declarations: [QrCodeComponent],
    exports: [QrCodeComponent]
})
export class QrCodeModule {}
