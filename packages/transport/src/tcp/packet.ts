import { RequestBase, ResponseBase, TransportContext, WritableResponse } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Socket, NetConnectOpts } from 'net';


export class TCPRequest<T = any> extends RequestBase<T> {
    constructor(public readonly socket: Socket) {
        super();
        this.socket
    }
    get context(): TransportContext {
        throw new Error('Method not implemented.');
    }
    get url(): string {
        throw new Error('Method not implemented.');
    }
    get params(): Record<string, any> {
        throw new Error('Method not implemented.');
    }
    get method(): string {
        throw new Error('Method not implemented.');
    }
    get withCredentials(): boolean {
        throw new Error('Method not implemented.');
    }
    get body(): T | null {
        throw new Error('Method not implemented.');
    }
    get responseType(): "arraybuffer" | "blob" | "json" | "text" {
        throw new Error('Method not implemented.');
    }
    isUpdate(): boolean {
        throw new Error('Method not implemented.');
    }
    getHeaders() {
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | number | string[] {
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

export class TCPResponse<T = any> extends ResponseBase<T> {
    getHeaders() {
        throw new Error('Method not implemented.');
    }
    get type(): number {
        throw new Error('Method not implemented.');
    }
    get status(): number {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    get body(): T {
        throw new Error('Method not implemented.');
    }
}

export class WritableTCPResponse<T = any> extends WritableResponse<T>  {
    get context(): TransportContext {
        throw new Error('Method not implemented.');
    }
    set status(status: number) {
        throw new Error('Method not implemented.');
    }
    set statusMessage(msg: string) {
        throw new Error('Method not implemented.');
    }
    get contentType(): string {
        throw new Error('Method not implemented.');
    }
    set contentType(type: string) {
        throw new Error('Method not implemented.');
    }
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(ok: boolean) {
        throw new Error('Method not implemented.');
    }
    set body(value: T) {
        throw new Error('Method not implemented.');
    }
    set length(n: number | undefined) {
        throw new Error('Method not implemented.');
    }
    get length(): number | undefined {
        throw new Error('Method not implemented.');
    }
    redirect(url: string, alt?: string): void {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | number | string[] {
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
    attachment(filename: string, options?: { contentType?: string | undefined; type?: string | undefined; fallback?: string | boolean | undefined; }): void {
        throw new Error('Method not implemented.');
    }
    get writable(): boolean {
        throw new Error('Method not implemented.');
    }
    throwError(status: number, message?: string): Error;
    throwError(message: string): Error;
    throwError(error: Error): Error;
    throwError(status: any, message?: any): Error {
        throw new Error('Method not implemented.');
    }
    getHeaders() {
        throw new Error('Method not implemented.');
    }
    get type(): number {
        throw new Error('Method not implemented.');
    }

}
