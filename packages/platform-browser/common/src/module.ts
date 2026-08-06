import { Module } from '@tsdi/ioc';
import { AudioCaptureAdapter, StreamAdapter, FileAdapter, ResponseStatusFormater, ContentSendAdapter } from '@tsdi/common';
import { BrowserResponseStatusFormater } from './formater';
import { BrowserStreamAdapter } from './stream';
import { BrowserContentSendAdapter } from './send';
import { BrowserFileAdapter } from './file';
import { MediaRecorderAudioCaptureAdapter } from './audio';

@Module({
    providers: [
        { provide: StreamAdapter, useClass: BrowserStreamAdapter },
        { provide: ContentSendAdapter, useClass: BrowserContentSendAdapter },
        { provide: FileAdapter, useClass: BrowserFileAdapter },
        { provide: ResponseStatusFormater, useClass: BrowserResponseStatusFormater },
        { provide: AudioCaptureAdapter, useClass: MediaRecorderAudioCaptureAdapter }
    ]
})
export class BrowserCommonModule { }
