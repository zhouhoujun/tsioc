import { Module } from '@tsdi/ioc';
import { AudioCaptureAdapter, StreamAdapter, FileAdapter, ResponseStatusFormater, ContentSendAdapter } from '@tsdi/common';
import { NodeResponseStatusFormater } from './formater';
import { ContentSendAdapterImpl } from './send';

import { NodeFileAdapter } from './file';
import { NodeStreamAdapter } from './stream';
import { NodeAudioCaptureAdapter } from './audio';



@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        { provide: ContentSendAdapter, useClass: ContentSendAdapterImpl },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater },
        { provide: AudioCaptureAdapter, useClass: NodeAudioCaptureAdapter }
    ]
})
export class ServerCommonModule {

}
