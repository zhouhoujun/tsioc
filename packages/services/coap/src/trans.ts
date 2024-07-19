import { isArray, isNumber, isString } from '@tsdi/ioc';
import { isBuffer, ctype } from '@tsdi/common/transport';
import { OptionName } from 'coap-packet';


export const defaultMaxSize = 61440; //1024 * 60;

export type OptionValue = null | string | number | Buffer | Buffer[];


export const transforms: Record<string, OptionName> = {
    'Content-Type': 'Content-Format',
    'content-type': 'Content-Format',
    // 'cache-control': "Max-Age"
};

export const ignores = [
    'content-type',
    'cache-control'
].reduce((p, c) => {
    p[c] = true;
    return p;
}, {} as Record<string, boolean>)

export const coapurl$ = /^coap(s)?:\/\//i;

const maxage$ = /max-age=\d+/;

export function transHead(head: string | number | readonly string[] | undefined, field: string): Buffer | string | number | Buffer[] {

    switch (field) {
        case 'content-type':
            return isString(head) && head.startsWith(ctype.APPL_JSON + ';') ? ctype.APPL_JSON : head as string;
        case 'cache-control':
            if (isString(head) && maxage$.test(head)) {
                const maxAge = head.split(',')[0].trim();
                return parseInt(maxAge.split('=')[1]);
            }
            return head as string;
        default:
            if (isString(head)) {
                if (head.startsWith(ctype.APPL_JSON + ';')) return ctype.APPL_JSON;
                return head;
            }

            if (isBuffer(head) || isNumber(head)) return head;
            if (isArray(head)) return head.map(v => Buffer.from(v.trim()))
            return `${head}`;
    }

}