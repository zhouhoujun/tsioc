import { ExecptionFilter, MiddlewareInst, TransportContext } from '@tsdi/core';
import { Injectable, tokenId } from '@tsdi/ioc';

@Injectable()
export class TcpContext extends TransportContext {
    get url(): string {
        throw new Error('Method not implemented.');
    }
    set url(value: string) {
        throw new Error('Method not implemented.');
    }
    get pathname(): string {
        throw new Error('Method not implemented.');
    }
    get query(): Record<string, any> {
        throw new Error('Method not implemented.');
    }
    get method(): string {
        throw new Error('Method not implemented.');
    }
    is(type: string | string[]): string | false | null {
        throw new Error('Method not implemented.');
    }
    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(value: any) {
        throw new Error('Method not implemented.');
    }
    isUpdate(): boolean {
        throw new Error('Method not implemented.');
    }
    get status(): number {
        throw new Error('Method not implemented.');
    }
    set status(status: number) {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    set statusMessage(msg: string) {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(ok: boolean) {
        throw new Error('Method not implemented.');
    }
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    redirect(url: string, alt?: string): void {
        throw new Error('Method not implemented.');
    }
    throwError(status: number, message?: string): Error;
    throwError(message: string): Error;
    throwError(error: Error): Error;
    throwError(status: any, message?: any): Error {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | number | string[] | undefined {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: any, val?: any): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }

}

export const TCP_MIDDLEWARES = tokenId<MiddlewareInst<TcpContext>[]>('TCP_MIDDLEWARES');

export const TCP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');