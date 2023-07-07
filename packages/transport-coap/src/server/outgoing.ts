import { IncomingHeader, Outgoing } from '@tsdi/core';
import { isArray, isNumber, isString } from '@tsdi/ioc';
import { ctype, hdr, isBuffer } from '@tsdi/transport';
import { OutgoingMessage } from 'coap';
import { OptionName } from 'coap-packet';
import { ignores, transforms } from '../trans';


export abstract class CoapOutgoing extends OutgoingMessage implements Outgoing {

    socket?: any;
    statusMessage?: string | undefined;
    headersSent?: boolean | undefined;
    closed?: boolean;
    destroyed?: boolean;



    // abstract getHeaders(): OutgoingHeaders;
    abstract hasHeader(field: string): boolean;
    abstract getHeader(field: string): IncomingHeader;

    abstract removeHeader(field: string): void;

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

        Object.defineProperty(outgoing, 'setHeader', {
            value(name: string, values: any) {
                const lower = name.toLowerCase();
                if (transforms[lower]) {
                    originSetHeader.apply(this, [transforms[lower], generHead(values)]);
                } else if (!ignores[name]) {
                    originSetHeader.apply(this, [name as OptionName, generHead(values)])
                }
            }
        });
        return outgoing as CoapOutgoing;
    }


}

const originSetHeader = OutgoingMessage.prototype.setHeader;


function generHead(head: string | number | readonly string[] | undefined): Buffer | string | number | Buffer[] {
    if (isString(head) && head.startsWith(ctype.APPL_JSON + ';')) {
        head = ctype.APPL_JSON
    }
    if (isArray(head)) return head.map(v => Buffer.from(v.trim()))
    if (isBuffer(head) || isNumber(head) || isString(head)) return head;
    return `${head}`;
}


function hasHeader(this: OutgoingMessage, field: string): boolean {
    field = transforms[field] ?? field;
    return this._packet.options?.some(o => o.name = field) == true;
}

function getHeader(this: OutgoingMessage, field: string): IncomingHeader {
    field = transforms[field] ?? field;
    return this._packet.options?.find(o => o.name = field) as IncomingHeader;
}

function removeHeader(this: OutgoingMessage, field: string): void {
    field = transforms[field] ?? field;
    const idx = this._packet.options?.findIndex(o => o.name === field);
    if (isNumber(idx) && idx >= 0) {
        this._packet.options?.splice(idx, 1);
    }
}
