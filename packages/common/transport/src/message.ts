import { BasePacket } from '@tsdi/common';
import { IReadableStream } from './stream';

export abstract class Message extends BasePacket<string | Buffer | IReadableStream> {

}
