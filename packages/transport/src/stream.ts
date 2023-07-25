import { UnsupportedMediaTypeExecption, IWritableStream, IEndable, StreamAdapter, PipeSource } from '@tsdi/core';
import { isArrayBuffer, isBlob, isFormData } from '@tsdi/common';
import { Abstract } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { toBuffer } from './utils';

/**
 * stream adapter
 */
@Abstract()
export abstract class AbstractStreamAdapter extends StreamAdapter {

    /**
     * send body
     * @param data 
     * @param request 
     * @param callback 
     * @param encoding 
     */
    async sendbody(data: any, request: IWritableStream | IEndable, callback: (err?: any) => void, encoding?: string): Promise<void> {
        let source: PipeSource;
        try {
            if (isArrayBuffer(data)) {
                source = Buffer.from(data);
            } else if (Buffer.isBuffer(data)) {
                source = data;
            } else if (isBlob(data)) {
                const arrbuff = await data.arrayBuffer();
                source = Buffer.from(arrbuff);
            } else if (this.isFormDataLike(data)) {
                if (isFormData(data)) {
                    const form = this.createFormData();
                    data.forEach((v, k, parent) => {
                        form.append(k, v);
                    });
                    data = form;
                }
                source = data.getBuffer();
            } else {
                source = String(data);
            }
            if (encoding) {
                switch (encoding) {
                    case 'gzip':
                    case 'deflate':
                        source = (this.isReadable(source) ? source : this.pipeline(source, this.createPassThrough())).pipe(this.createGzip());
                        break;
                    case 'identity':
                        break;
                    default:
                        throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
                }
            }
            if (this.isStream(request)) {
                await this.pipeTo(source, request);
                callback();
            } else {
                if (this.isStream(source)) {
                    const buffers = await toBuffer(source);
                    request.end(buffers, callback);
                } else {
                    request.end(source, callback);
                }
            }
        } catch (err) {
            callback(err);
        }
    }

}
