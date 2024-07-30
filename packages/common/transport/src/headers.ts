import { Header, HeaderAccess, HeaderAdapter, HeaderMappings, HeadersLike, IHeaders } from '@tsdi/common';
import { Injectable, isArray, isDefined, isNil } from '@tsdi/ioc';

@Injectable()
export class DefaultHeaderAdapter implements HeaderAdapter {

    hasHeader(headers: HeadersLike, header: string): boolean {
        return headers.hasHeader ? (headers as HeaderAccess).hasHeader(header) : isDefined((headers as IHeaders)[header]);
    }

    getHeader(headers: HeadersLike, header: string): string | undefined {
        let values: any;
        if (headers.getHeader) {
            values = (headers as HeaderAccess).getHeader(header)
        } else {
            values = (headers as IHeaders)[header];
        }
        return isArray(values) && values.length ? values[0] : values
    }

    setHeader<T extends HeadersLike>(headers: T, header: string, value: Header): T {
        if (headers.setHeader) {
            let res: any;
            if (isNil(value)) {
                res = (headers as HeaderAccess).removeHeader(header);
            } else {
                res = (headers as HeaderAccess).setHeader(header, value);
            }
            if (res) {
                headers = res;
            }
        } else {
            if (isNil(value)) {
                delete (headers as IHeaders)[header.toLowerCase()];
            } else {
                (headers as IHeaders)[header.toLowerCase()] = value;
            }
        }
        return headers;
    }

    removeHeader<T extends HeadersLike>(headers: T, header: string): T {
        if (headers.removeHeader) {
            const res = (headers as HeaderAccess).removeHeader(header);
            if (res) {
                headers = res;
            }
        } else {
            delete (headers as IHeaders)[header.toLowerCase()];
        }
        return headers;
    }

    removeHeaders<T extends HeadersLike>(headers: T): T {
        if (headers.getHeaderNames) {
            (headers as HeaderAccess).getHeaderNames().forEach(n => (headers as HeaderAccess).removeHeader(n))
        } else {
            Object.keys(headers).forEach(n => {
                delete (headers as IHeaders)[n];
            })
        }
        return headers;
    }

    hasContentType(headers: HeadersLike): boolean {
        return this.hasHeader(headers, 'content-type')
    }
    getContentType(headers: HeadersLike): string {
        return this.getHeader(headers, 'content-type')!
    }

    setContentType<T extends HeadersLike>(headers: T, type: string | null | undefined): T {
        return this.setHeader(headers, 'content-type', type);
    }
    hasContentLength(headers: HeadersLike): boolean {
        return this.hasHeader(headers, 'content-length')
    }
    setContentLength<T extends HeadersLike>(headers: T, len: number | null | undefined): T {
        return this.setHeader(headers, 'content-length', len)
    }
    getContentLength(headers: HeadersLike): number {
        const len = this.getHeader(headers, 'content-length') ?? '0';
        return ~~len
    }
    hasContentEncoding(headers: HeadersLike): boolean {
        return this.hasHeader(headers, 'content-encoding')
    }
    getContentEncoding(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'content-encoding')
    }
    setContentEncoding<T extends HeadersLike>(headers: T, encoding: string | null): T {
        return this.setHeader(headers, 'content-encoding', encoding)
    }
    getContentDisposition(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'content-disposition')
    }
    setContentDisposition<T extends HeadersLike>(headers: T, disposition: string | null): T {
        return this.setHeader(headers, 'content-disposition', disposition)
    }
    getIdentity(headers: HeadersLike): string | number | undefined {
        return this.getHeader(headers, 'identity')
    }
    setIdentity<T extends HeadersLike>(headers: T, identity: string | number | undefined): T {
        return this.setHeader(headers, 'identity', identity)
    }
    getMethod(headers: HeadersLike, prefix?: boolean): string | undefined {
        return this.getHeader(headers, prefix ? ':method' : 'method')
    }
    setMethod<T extends HeadersLike>(headers: T, method: string | undefined, prefix?: boolean): T {
        return this.setHeader(headers, prefix ? ':method' : 'method', method)
    }
    getPath(headers: HeadersLike, prefix?: boolean): string | undefined {
        return this.getHeader(headers, prefix ? ':path' : 'path')
    }
    setPath<T extends HeadersLike>(headers: T, path: string | undefined, prefix?: boolean): T {
        return this.setHeader(headers, prefix ? ':path' : 'path', path)
    }
    getStatus(headers: HeadersLike, prefix?: boolean): string | number | undefined {
        return this.getHeader(headers, prefix ? ':staus' : 'status')
    }
    setStatus<T extends HeadersLike>(headers: T, status: string | number, prefix?: boolean): T {
        return this.setHeader(headers, prefix ? ':staus' : 'status', status)
    }
    getStatusMessage(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'status-message')
    }
    setStatusMessage<T extends HeadersLike>(headers: T, statusMessage: string | undefined): T {
        return this.setHeader(headers, 'status-message', statusMessage)
    }
    getAccept(headers: HeadersLike): string | string[] | undefined {
        return this.getHeader(headers, 'accept')
    }
    setAccept<T extends HeadersLike>(headers: T, accept: string | string[] | undefined): T {
        return this.setHeader(headers, 'accept', accept)
    }
    getAcceptCharset(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'accept-charset')
    }
    setAcceptCharset<T extends HeadersLike>(headers: T, charset: string | undefined): T {
        return this.setHeader(headers, 'accept-charset', charset)
    }
    getAcceptEncoding(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'accept-encoding')
    }
    setAcceptEncoding<T extends HeadersLike>(headers: T, encodings: string | undefined): T {
        return this.setHeader(headers, 'accept-encoding', encodings)
    }
    getAcceptLanguage(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'accept-language')
    }
    setAcceptLanguage<T extends HeadersLike>(headers: T, languages: string | undefined): T {
        return this.setHeader(headers, 'accept-language', languages)
    }
    getLastModified(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'last-modified')
    }
    setLastModified<T extends HeadersLike>(headers: T, modified: string | undefined): T {
        return this.setHeader(headers, 'last-modified', modified)
    }
    getCacheControl(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'cache-control')
    }
    setCacheControl<T extends HeadersLike>(headers: T, control: string | undefined): T {
        return this.setHeader(headers, 'cache-control', control)
    }
    getLocation(headers: HeadersLike): string | undefined {
        return this.getHeader(headers, 'location')
    }
    setLocation<T extends HeadersLike>(headers: T, location: string | undefined): T {
        return this.setHeader(headers, 'location', location)
    }

}