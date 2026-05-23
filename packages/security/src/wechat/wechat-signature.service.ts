import * as crypto from 'crypto';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class WechatSignatureService {
    sign(token: string, timestamp: string, nonce: string): string {
        return crypto.createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex');
    }

    verify(signature: string, token: string, timestamp: string, nonce: string): boolean {
        const computed = this.sign(token, timestamp, nonce);
        const actual = Buffer.from(computed);
        const expected = Buffer.from(signature);
        if (actual.length !== expected.length) {
            return false;
        }
        return crypto.timingSafeEqual(actual, expected);
    }
}
