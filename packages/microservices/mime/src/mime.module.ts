import { MimeAdapter, MimeDb, MimeTypes, AcceptsPriority } from '@tsdi/common';
import { Module } from '@tsdi/ioc';
import { MimeAdapterImpl, MimeTypesImpl } from './impl/mime';
import { BasicMimeDb } from './impl/mimedb';
import { AcceptsPriorityImpl } from './impl/accepts';

@Module({
    providers: [
        { provide: MimeTypes, useClass: MimeTypesImpl },
        { provide: MimeDb, useClass: BasicMimeDb },
        { provide: MimeAdapter, useClass: MimeAdapterImpl },
        { provide: AcceptsPriority, useClass: AcceptsPriorityImpl }
    ],
    exports: [
        MimeTypes, MimeDb, MimeAdapter, AcceptsPriority
    ]
})
export class MimeModule {

}