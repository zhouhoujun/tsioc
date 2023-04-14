import { GET, POST } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc'
import { StatusVaildator } from '@tsdi/transport'
import { HttpStatusCode, statusMessage } from '@tsdi/common';

@Injectable({ static: true })
export class HttpStatusVaildator implements StatusVaildator<number> {

    get ok(): number {
        return HttpStatusCode.Ok
    }
    get notFound(): number {
        return HttpStatusCode.NotFound
    }
    get serverError(): number {
        return HttpStatusCode.InternalServerError
    }
    get none(): number {
        return 0;
    }
    get noContent(): number {
        return HttpStatusCode.NoContent;
    }

    isStatus(status: number): boolean {
        return !!statusMessage[status as HttpStatusCode]
    }
    isOk(status: number): boolean {
        return status == HttpStatusCode.Ok;
    }
    isNotFound(status: number): boolean {
        return status == HttpStatusCode.NotFound;
    }
    isEmpty(status: number): boolean {
        return emptyStatus[status];
    }
    isRedirect(status: number): boolean {
        return redirectStatus[status];
    }
    isRequestFailed(status: number): boolean {
        return status >= 400 && status < 500;
    }
    isServerError(status: number): boolean {
        return status >= 500;
    }
    isRetry(status: number): boolean {
        return retryStatus[status];
    }


    redirectBodify(status: string | number, method?: string | undefined): boolean {
        if (!method) return status === 303;
        return status === 303 || ((status === 301 || status === 302) && method === POST)
    }

    redirectDefaultMethod(): string {
        return GET;
    }

}


/**
 * status codes for redirects
 */
const redirectStatus: Record<number | string, boolean> = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
}

/**
 * status codes for empty bodies
 */
const emptyStatus: Record<number | string, boolean> = {
    204: true,
    205: true,
    304: true
}

/**
 * status codes for when you should retry the request
 */
const retryStatus: Record<number | string, boolean> = {
    502: true,
    503: true,
    504: true
}
