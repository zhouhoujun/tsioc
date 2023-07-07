
import { hdr } from '@tsdi/transport';
import { CoapMethod, OptionName } from 'coap-packet';

export const transforms: Record<string, OptionName> = {
    'Content-Type': 'Content-Format',
    'content-type': 'Content-Format'
};

export const ignores = [
    hdr.LAST_MODIFIED,
    hdr.CACHE_CONTROL
].reduce((p, c) => {
    p[c] = true;
    return p;
}, {} as Record<string, boolean>)

export const $coapurl = /^coap(s)?:\/\//i;