import { Abstract, InvocationContext } from '@tsdi/ioc';
import { connectable, defer, Observable, Observer, Subject } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ReadPacket, WritePacket } from '../packet';
import { Pattern, stringify } from '../pattern';
import { TransportBackend, TransportContext } from '../handler';


@Abstract()
export abstract class ClientTransportBackend<TInput = any, TOutput extends WritePacket = WritePacket>
    extends TransportBackend<TInput, TOutput>  {

    abstract connect(): Promise<any>;

    handle(ctx: TransportContext<TInput>): Observable<TOutput> {
        if (ctx.event) {
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
                    () => new Observable<TOutput>((observer) => {
                        const callback = this.createObserver(observer);
                        return this.publish(ctx, callback);
                    })
                ));
        }
    }

    protected createObserver<T>(
        observer: Observer<T>,
    ): (packet: TOutput) => void {
        return ({ err, response, disposed }: TOutput) => {
            if (err) {
                return observer.error(this.serializeError(err));
            } else if (response !== undefined && disposed) {
                observer.next(this.serializeResponse(response));
                return observer.complete();
            } else if (disposed) {
                return observer.complete();
            }
            observer.next(this.serializeResponse(response));
        };
    }

    /**
     * publish handle.
     * @param ctx transport context.
     * @param callback 
     */
    protected abstract publish(
        ctx: TransportContext<TInput>,
        callback: (packet: TOutput) => void,
    ): () => void;

    /**
     * dispatch event.
     * @param packet 
     */
    protected abstract dispatchEvent<T = any>(ctx: TransportContext<TInput>): Promise<T>;

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
