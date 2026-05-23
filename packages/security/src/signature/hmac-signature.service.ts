import * as crypto from 'crypto';
import { Injectable } from '@tsdi/ioc';

export interface HmacSignatureOptions {
    algorithm?: string;
    encoding?: crypto.BinaryToTextEncoding;
}

@Injectable()
export class HmacSignatureService {
    sign(body: Buffer | string, secret: string, options: HmacSignatureOptions = {}): string {
        const algorithm = options.algorithm ?? 'sha256';
        const encoding = options.encoding ?? 'hex';
        return crypto.createHmac(algorithm, secret).update(body).digest(encoding);
    }

    verify(body: Buffer | string, signature: string, secret: string, options: HmacSignatureOptions = {}): boolean {
        const computed = this.sign(body, secret, options);
        const actual = Buffer.from(computed);
        const expected = Buffer.from(signature);
        if (actual.length !== expected.length) {
            return false;
        }
        return crypto.timingSafeEqual(actual, expected);
    }
}
