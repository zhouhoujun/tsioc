import { Module } from '@tsdi/ioc';
import { ToastService } from './toast';
import { ToastStackComponent } from './toast-stack';
import { ToastProviderComponent } from './toast-provider';

/**
 * Complex component entry point (`@tsdi/components/common/toast`). Provides
 * the queue service and declares the shared toast strip; renderers only paint
 * the markup.
 */
@Module({
    providers: [ToastService],
    declarations: [ToastStackComponent, ToastProviderComponent],
    exports: [ToastStackComponent, ToastProviderComponent]
})
export class ToastModule {}
