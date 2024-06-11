// import { Injectable, Type, getClass } from '@tsdi/ioc';
// import { Observable, mergeMap, of, throwError } from 'rxjs';
// import { CodingMappings } from './mappings';
// import { CodingType, CodingsContext } from './context';
// import { CodingsNotHandleExecption } from './execptions';


// /**
//  * Codings
//  */
// @Injectable({
//     static: true,
//     providedIn: 'root'
// })
// export class Codings {

//     constructor(private mappings: CodingMappings) { }

//     encode<TOutput = any>(input: any, context: CodingsContext): Observable<TOutput> {
//         const type = getClass(input);
//         return this.encodeType(type, input, context);
//     }

//     deepEncode<TOutput = any>(input: any, context: CodingsContext): Observable<TOutput> {
//         return this.encode(input, context)
//             .pipe(
//                 mergeMap(data => {
//                     if (context.encodeCompleted) return of(data);
//                     return this.encode(data, context)
//                 })
//             )
//     }

//     encodeType<T>(type: Type<T> | string, data: T, context: CodingsContext): Observable<any> {
//         const handlers = this.mappings.getEncodeHanlders(type, context.options);

//         if (handlers && handlers.length) {
//             return handlers.reduce((obs$, curr) => {
//                 return obs$.pipe(
//                     mergeMap(i => {
//                         if (context.encodeCompleted) return of(i);
//                         return curr.handle(i, context.next(i, CodingType.Encode))
//                     })
//                 );
//             }, of(data))
//         } else {
//             return throwError(() => new CodingsNotHandleExecption(data, type, CodingType.Encode, context, `${context.options.group} ${context.options.name ?? ''}`))
//         }
//     }

//     decode<TOutput = any>(input: any, context: CodingsContext): Observable<TOutput> {
//         const type = getClass(input);
//         return this.decodeType(type, input, context)
//     }

//     deepDecode<TOutput = any>(input: any, context: CodingsContext): Observable<TOutput> {
//         return this.decode(input, context)
//             .pipe(
//                 mergeMap(data => {
//                     if (context.decodeCompleted) return of(data);
//                     return this.decode(data, context)
//                 })
//             )
//     }

//     decodeType<T>(type: Type<T> | string, data: T, context: CodingsContext): Observable<any> {
//         const handlers = this.mappings.getDecodeHanlders(type, context.options);

//         if (handlers && handlers.length) {
//             return handlers.reduce((obs$, curr) => {
//                 return obs$.pipe(
//                     mergeMap(i => {
//                         if (context.encodeCompleted) return of(i);
//                         return curr.handle(i, context.next(i, CodingType.Decode))
//                     })
//                 );
//             }, of(data))
//         } else {
//             return throwError(() => new CodingsNotHandleExecption(data, type, CodingType.Decode, context, `${context.options.group} ${context.options.name ?? ''}`))
//         }
//     }
// }
