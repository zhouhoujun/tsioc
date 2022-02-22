// import { Abstract, isString } from '@tsdi/ioc';
// import { connectable, defer, Observable, Observer, Subject } from 'rxjs';
// import { mergeMap } from 'rxjs/operators';
// import { Pattern, ReadPacket, WritePacket } from '../packet';
// import { stringify } from '../context';
// import { TransportBackend } from '../handler';
// import { Startup } from '../../startup';


// @Abstract()
// export abstract class ServerTransportBackend<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket>
//     extends TransportBackend<TRequest, TResponse> implements Startup {

//     abstract startup(): Promise<any>;

//     abstract close(): Promise<any>;

//     handle(req: TRequest): Observable<TResponse> {
//         if (this.isEvent(req)) {
//             const source = defer(async () => this.startup()).pipe(
//                 mergeMap(() => this.dispatchEvent(req)),
//             );
//             const connectableSource = connectable(source, {
//                 connector: () => new Subject(),
//                 resetOnDisconnect: false,
//             });
//             connectableSource.connect();
//             return connectableSource;
//         } else {
//             return defer(async () => this.startup()).pipe(
//                 mergeMap(
//                     () => new Observable<TResponse>((observer) => {
//                         const callback = this.createObserver(observer);
//                         return this.publish(req, callback);
//                     })
//                 ));
//         }
//     }

//     protected createObserver<T>(
//         observer: Observer<T>,
//     ): (packet: TResponse) => void {
//         return ({ error, body, disposed }: TResponse) => {
//             if (error) {
//                 return observer.error(this.serializeError(error));
//             } else if (body !== undefined && disposed) {
//                 observer.next(this.serializeResponse(body));
//                 return observer.complete();
//             } else if (disposed) {
//                 return observer.complete();
//             }
//             observer.next(this.serializeResponse(body));
//         };
//     }

//     /**
//      * publish handle.
//      * @param packet packet.
//      * @param callback 
//      */
//     protected abstract publish(
//         packet: TRequest,
//         callback: (packet: TResponse) => void,
//     ): () => void;

//     /**
//      * dispatch event.
//      * @param packet 
//      */
//     protected abstract dispatchEvent<T = any>(packet: TRequest): Promise<T>;

//     /**
//      * is event request or not.
//      */
//     protected abstract isEvent(req: TRequest): boolean;

//     protected normalizePattern(pattern: Pattern): string {
//         return stringify(pattern);
//     }

//     protected getRouteFromPattern(pattern: Pattern): string {
//         let validPattern: Pattern | undefined;
//         if (isString(pattern)) {
//             try {
//                 validPattern = JSON.parse(pattern);
//             } catch (error) {
//                 // Uses a fundamental object (`pattern` variable without any conversion)
//                 validPattern = pattern;
//             }
//         }
//         return this.normalizePattern(validPattern ?? pattern);
//     }


//     protected serializeError(err: any): any {
//         return err;
//     }

//     protected serializeResponse(response: any): any {
//         return response;
//     }
// }
