import { Module } from '@tsdi/ioc';
import { AudioCaptureAdapter, AudioPlaybackAdapter, StreamAdapter, FileAdapter, ResponseStatusFormater, ContentSendAdapter } from '@tsdi/common';
import { BrowserResponseStatusFormater } from './formater';
import { BrowserStreamAdapter } from './stream';
import { BrowserContentSendAdapter } from './send';
import { BrowserFileAdapter } from './file';
import { BrowserAudioPlaybackAdapter, MediaRecorderAudioCaptureAdapter } from './audio';

@Module({
    providers: [
        { provide: StreamAdapter, useClass: BrowserStreamAdapter },
        { provide: ContentSendAdapter, useClass: BrowserContentSendAdapter },
        { provide: FileAdapter, useClass: BrowserFileAdapter },
        { provide: ResponseStatusFormater, useClass: BrowserResponseStatusFormater },
        { provide: AudioCaptureAdapter, useClass: MediaRecorderAudioCaptureAdapter },
        { provide: AudioPlaybackAdapter, useClass: BrowserAudioPlaybackAdapter }
    ]
})
export class BrowserCommonModule { }
