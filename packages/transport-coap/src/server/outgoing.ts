import { IncomingHeader, Outgoing, OutgoingHeaders } from '@tsdi/core';
import { isNumber } from '@tsdi/ioc';
import { OutgoingMessage } from 'coap';


export class CoapOutgoing extends OutgoingMessage implements Outgoing {

    socket?: any;
    statusMessage?: string | undefined;
    headersSent?: boolean | undefined;


    getHeaders?(): OutgoingHeaders {
        return this._packet.options?.reduceRight((v, c) => v[c.name] = c.value, {} as any) as any;
    }
    hasHeader(field: string): boolean {
        return this._packet.options?.some(o => o.name = field) == true;
    }
    getHeader(field: string): IncomingHeader {
        return this._packet.options?.find(o => o.name = field) as IncomingHeader;
    }

    removeHeader(field: string): void {
        const idx = this._packet.options?.findIndex(o => o.name === field);
        if (isNumber(idx) && idx >= 0) {
            this._packet.options?.splice(idx, 1);
        }
    }

    static parse(outgoing: OutgoingMessage): CoapOutgoing {

        Object.defineProperty(outgoing, 'hasHeader', {
            value: hasHeader
        });

        Object.defineProperty(outgoing, 'getHeader', {
            value: getHeader
        });

        Object.defineProperty(outgoing, 'removeHeader', {
            value: removeHeader
        });

        return outgoing as CoapOutgoing;
    }

}

function hasHeader(this: OutgoingMessage, field: string): boolean {
    return this._packet.options?.some(o => o.name = field) == true;
}

function getHeader(this: OutgoingMessage, field: string): IncomingHeader {
    return this._packet.options?.find(o => o.name = field) as IncomingHeader;
}
function removeHeader(this: OutgoingMessage, field: string): void {
    const idx = this._packet.options?.findIndex(o => o.name === field);
    if (isNumber(idx) && idx >= 0) {
        this._packet.options?.splice(idx, 1);
    }
}
