import { IncomingHeader, Outgoing } from '@tsdi/core';
import { isArray, isNumber, isString } from '@tsdi/ioc';
import { hdr, isBuffer } from '@tsdi/transport';
import { OutgoingMessage } from 'coap';
import { OptionName } from 'coap-packet';


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
                } else if (ignores.indexOf(name) < 0) {
                    originSetHeader.apply(this, [name as OptionName, generHead(values)])
                }
            }
        });
        return outgoing as CoapOutgoing;
    }


}

const originSetHeader = OutgoingMessage.prototype.setHeader;


function generHead(head: string | number | readonly string[] | undefined): Buffer | string | number | Buffer[] {
    if (isString(head) && head.indexOf(';') > 0) {
        head = head.substring(0, head.indexOf(';'));
    }
    if (isArray(head)) return head.map(v => Buffer.from(v.trim()))
    if (isBuffer(head) || isNumber(head)) return head;
    return `${head}`;
}

const transforms: Record<string, OptionName> = {
    'content-type': 'Content-Format'
};

const ignores = [
    hdr.LAST_MODIFIED,
    hdr.CACHE_CONTROL
]

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


