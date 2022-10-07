/* eslint-disable no-case-declarations */
import {
    EndpointBackend, isArrayBuffer, isBlob, isFormData, ResHeaders, ResponseJsonParseError,
    TransportErrorResponse, TransportEvent, TransportResponse, ClientContext,
    UnsupportedMediaTypeExecption, TransportRequest
} from '@tsdi/core';
import { Injectable, _tyundef } from '@tsdi/ioc';
import { PassThrough, pipeline, Writable, Readable, PipelineSource } from 'stream';
import { Observable, mergeMap } from 'rxjs';
import * as zlib from 'zlib';
import { hdr } from '../consts';
import { MimeAdapter, MimeTypes } from '../mime';
import { createFormData, isBuffer, isFormDataLike, pmPipeline, toBuffer } from '../utils';



/**
 * transport restful endpoint backend.
 */
@Injectable()
export class TransportBackend implements EndpointBackend<TransportRequest, TransportEvent> {

    handle(req: TransportRequest, ctx: ClientContext): Observable<TransportEvent> {
        const url = req.url;
        return ctx.transport.transformer.transform(req, ctx)
            .pipe(
                mergeMap(async body => {
                    let type = ctx.responseType;
                    const headers = ctx.get(ResHeaders);
                    const status = ctx.transport.status.parse(headers.get(hdr.STATUS) ?? headers.get(hdr.STATUS2));

                    let statusText: string | undefined;
                    if (type === 'stream' && body instanceof Readable) {
                        return new TransportResponse({
                            url,
                            body,
                            headers,
                            status,
                            statusText
                        })
                    }

                    let error: any;
                    let ok = true;
                    let originalBody: any;
                    const contentType = headers.get(hdr.CONTENT_TYPE) as string;
                    body = body instanceof Readable ? await toBuffer(body) : body;
                    if (contentType) {
                        const adapter = ctx.get(MimeAdapter);
                        const mity = ctx.get(MimeTypes);
                        if (type === 'json' && !adapter.match(mity.json, contentType)) {
                            if (adapter.match(mity.xml, contentType) || adapter.match(mity.text, contentType)) {
                                type = 'text';
                            } else {
                                type = 'blob';
                            }
                        }
                    }
                    switch (type) {
                        case 'json':
                            // Save the original body, before attempting XSSI prefix stripping.
                            if (isBuffer(body)) {
                                body = new TextDecoder().decode(body);
                            }
                            originalBody = body;
                            try {
                                body = body.replace(XSSI_PREFIX, '');
                                // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                body = body !== '' ? JSON.parse(body) : null
                            } catch (err) {
                                // Since the JSON.parse failed, it's reasonable to assume this might not have been a
                                // JSON response. Restore the original body (including any XSSI prefix) to deliver
                                // a better error response.
                                body = originalBody;

                                // If this was an error request to begin with, leave it as a string, it probably
                                // just isn't JSON. Otherwise, deliver the parsing error to the user.
                                if (ok) {
                                    // Even though the response status was 2xx, this is still an error.
                                    ok = false;
                                    // The parse error contains the text of the body that failed to parse.
                                    error = { error: err, text: body } as ResponseJsonParseError
                                }
                            }
                            break;

                        case 'arraybuffer':
                            body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                            break;
                        case 'blob':
                            body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                                type: headers.get(hdr.CONTENT_TYPE) as string
                            });
                            break;
                        case 'text':
                        default:
                            body = new TextDecoder().decode(body);
                            break;
                    }



                    if (!ok) throw new TransportErrorResponse({
                        url,
                        error: error ?? body,
                        status,
                        statusText
                    });

                    return new TransportResponse({
                        url,
                        body,
                        headers,
                        status,
                        statusText
                    });

                })
            );
    }
}


/**
 * json xss.
 */
export const XSSI_PREFIX = /^\)\]\}',?\n/;

export async function sendbody(data: any, request: Writable, error: (err: any) => void, encoding?: string): Promise<void> {
    let source: PipelineSource<any>;
    try {
        if (isArrayBuffer(data)) {
            source = Buffer.from(data);
        } else if (isBuffer(data)) {
            source = data;
        } else if (isBlob(data)) {
            const arrbuff = await data.arrayBuffer();
            source = Buffer.from(arrbuff);
        } else if (isFormDataLike(data)) {
            if (isFormData(data)) {
                const form = createFormData();
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
                    const readable = source instanceof Readable ? source : pipeline(source, new PassThrough());
                    source = readable.pipe(zlib.createGzip());
                    break;
                case 'identity':
                    break;
                default:
                    throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
            }
        }
        await pmPipeline(source, request)
    } catch (err) {
        error(err);
    }
}




