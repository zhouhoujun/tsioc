import { GET, MESSAGE } from '@tsdi/core';
import { Inject, Injectable, tokenId } from '@tsdi/ioc';
import { StatusVaildator } from '@tsdi/transport';


@Injectable({ static: true })
export class CoapStatusVaildator implements StatusVaildator<string>{

    get noContent(): string {
        throw new Error('Method not implemented.');
    }
    
    get notFound(): string {
        throw new Error('Method not implemented.');
    }
    get found(): string {
        throw new Error('Method not implemented.');
    }
    get ok(): string {
        throw new Error('Method not implemented.');
    }
    get none(): string {
        throw new Error('Method not implemented.');
    }
    get serverError(): string {
        throw new Error('Method not implemented.');
    }
    isStatus(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isOk(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isNotFound(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isEmpty(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isRedirect(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isRequestFailed(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isServerError(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    isRetry(status: string): boolean {
        throw new Error('Method not implemented.');
    }
    redirectBodify(status: string, method?: string | undefined): boolean {
        throw new Error('Method not implemented.');
    }

    redirectDefaultMethod(): string {
        return GET;
    }

}
