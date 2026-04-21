import { StatusAdapter } from '@tsdi/common';
export declare class HttpStatusAdapter implements StatusAdapter {
    get ok(): number;
    get found(): number;
    get notFound(): number;
    get serverError(): number;
    get none(): number;
    get noContent(): number;
    get gatewayTimeout(): number;
    isStatus(status: number): boolean;
    isOk(status: number): boolean;
    isNotFound(status: number): boolean;
    isEmpty(status: number): boolean;
    isEmptyException(status: number): boolean;
    isRedirect(status: number): boolean;
    isRequestFailed(status: number): boolean;
    isServerError(status: number): boolean;
    isRetry(status: number): boolean;
    redirectBodify(status: string | number, method?: string | undefined): boolean;
    redirectDefaultMethod(): string;
}
