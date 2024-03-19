import { MimeAdapter, MimeDb, MimeTypes } from '@tsdi/common/transport';
import { Module } from '@tsdi/ioc';
import { MimeAdapterImpl, MimeTypesImpl } from './impl/mime';
import { BasicMimeDb } from './impl/mimedb';
import { AcceptsPriority } from './accepts';
import { AcceptsPriorityImpl } from './impl/accepts';

@Module({
    providers: [
        { provide: MimeTypes, useClass: MimeTypesImpl },
        { provide: MimeDb, useClass: BasicMimeDb },
        { provide: MimeAdapter, useClass: MimeAdapterImpl },
        { provide: AcceptsPriority, useClass: AcceptsPriorityImpl }
    ]
})
export class MimeModule {

}