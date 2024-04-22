import { ArgumentExecption, Injectable, isPromise, isString, tokenId } from '@tsdi/ioc';
import { DecodeHandler, EncodeHandler } from '../metadata';
import { CodingsContext } from '../context';
import { Observable, Subscriber, of, throwError } from 'rxjs';
import { StreamAdapter, isBuffer } from '../../StreamAdapter';
import { Packet, PacketData } from '../../packet';
import { PacketIdGenerator } from '../../PacketId';
import { TransportOpts } from '../../TransportSession';
import { HeaderDeserialization, PayloadDeserialization } from './packet.decodings';
import { IDuplexStream } from '../../stream';
import { Interceptor } from '@tsdi/core';



export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('PACKET_DECODE_INTERCEPTORS');


@Injectable({ static: true })
export class PacketCodingsHandlers {

    private packs: Map<string | number, PacketData & { cacheSize: number }>;
    constructor() {
        this.packs = new Map();
    }

    @DecodeHandler('PACKET', { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    decodeHandle(context: CodingsContext) {
        const data = context.last<string | Buffer>();
        let input = isString(data) ? Buffer.from(data) : data;

        if (!isBuffer(input)) {
            return throwError(() => new ArgumentExecption('asset decoding input is not buffer'));
        }

        const injector = context.session!.injector;
        const idGenerator = injector.get(PacketIdGenerator);
        const streamAdapter = injector.get(StreamAdapter);
        const headerDeserialization = injector.get(HeaderDeserialization, null);
        // const payloadDeserialization = injector.get(PayloadDeserialization, null);

        return new Observable((subscriber: Subscriber<Packet>) => {
            const id = idGenerator.readId(input);
            input = input.subarray(idGenerator.idLenght);
            const options = context.options as TransportOpts;

            let packet = this.packs.get(id);
            if (!packet) {
                if (options.headDelimiter) {
                    const hidx = input.indexOf(options.headDelimiter);
                    if (hidx >= 0) {
                        const headerBuf = input.subarray(0, hidx);
                        try {
                            packet = headerDeserialization ? headerDeserialization.deserialize(headerBuf) : JSON.parse(new TextDecoder().decode(headerBuf));
                            packet!.cacheSize = 0;
                        } catch (err) {
                            subscriber.error(err);
                        }
                        input = input.subarray(hidx + 1);
                    }
                } else {
                    packet = headerDeserialization ? headerDeserialization.deserialize(input) : JSON.parse(new TextDecoder().decode(input));
                }

                if (packet) {
                    const len = packet.payloadLength;
                    if (!len) {
                        packet.payload = input;
                        subscriber.next(packet);
                        subscriber.complete();
                    } else {
                        packet.payloadLength = len;
                        packet.cacheSize = input.length;
                        if (packet.cacheSize >= packet.payloadLength) {
                            packet.payload = input;
                            subscriber.next(packet);
                            subscriber.complete();
                        } else {
                            const stream = packet.payload = streamAdapter.createPassThrough();
                            stream.write(input);
                            this.packs.set(id, packet);
                            subscriber.complete();
                        }
                    }
                } else {
                    subscriber.complete();
                }
            } else {
                packet.cacheSize += input.length;
                (packet.payload as IDuplexStream).write(input);
                if (packet.cacheSize >= (packet.payloadLength || 0)) {
                    (packet.payload as IDuplexStream).end();
                    this.packs.delete(packet.id);
                    subscriber.next(packet);
                    subscriber.complete();
                } else {
                    subscriber.complete();
                }
            }

            return subscriber;
        });

    }

    @EncodeHandler('PACKET', { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    encode(context: CodingsContext) {
        const input = context.last<any>();
        try {
            const jsonStr = JSON.stringify(input);
            const buff = Buffer.from(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => err);
        }
    }
}


