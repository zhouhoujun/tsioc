import { Abstract } from '@tsdi/ioc';
import { connectable, defer, Observable, Observer, Subject } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Pattern } from '../pattern';
import { ReadPacket, WritePacket } from '../packet';
import { TransportContext, stringify } from '../context';
import { TransportBackend } from '../handler';


@Abstract()
export abstract class ClientTransportBackend<TRequest extends ReadPacket = ReadPacket, TRepsonse extends WritePacket = WritePacket>
    extends TransportBackend<TRequest, TRepsonse>  {

    abstract connect(): Promise<any>;

    handle(ctx: TransportContext<TRequest>): Observable<TRepsonse> {
        if (ctx.isEvent) {
            const source = defer(async () => this.connect()).pipe(
                mergeMap(() => this.dispatchEvent(ctx)),
            );
            const connectableSource = connectable(source, {
                connector: () => new Subject(),
                resetOnDisconnect: false,
            });
            connectableSource.connect();
            return connectableSource;
        } else {
            return defer(async () => this.connect()).pipe(
                mergeMap(
                    () => new Observable<TRepsonse>((observer) => {
                        const callback = this.createObserver(observer);
                        return this.publish(ctx, callback);
                    })
                ));
        }
    }

    protected createObserver<T>(
        observer: Observer<T>,
    ): (packet: TRepsonse) => void {
        return ({ error, body, disposed }: TRepsonse) => {
            if (error) {
                return observer.error(this.serializeError(error));
            } else if (body !== undefined && disposed) {
                observer.next(this.serializeResponse(body));
                return observer.complete();
            } else if (disposed) {
                return observer.complete();
            }
            observer.next(this.serializeResponse(body));
        };
    }

    /**
     * publish handle.
     * @param ctx transport context.
     * @param callback 
     */
    protected abstract publish(
        ctx: TransportContext<TRequest>,
        callback: (packet: TRepsonse) => void,
    ): () => void;

    /**
     * dispatch event.
     * @param packet 
     */
    protected abstract dispatchEvent<T = any>(ctx: TransportContext<TRequest>): Promise<T>;

    protected normalizePattern(pattern: Pattern): string {
        return stringify(pattern);
    }

    protected serializeError(err: any): any {
        return err;
    }

    protected serializeResponse(response: any): any {
        return response;
    }
}
