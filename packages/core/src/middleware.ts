import { Module } from './metadata/decor';
import { ContextFactory, RouteVaildator } from './middlewares/context';
import { MessageQueue } from './middlewares/queue';
import { RootMessageQueue } from './middlewares/root';
import { MsgRouteVaildator, BASE_CONTEXT_FACTORY_IMPL } from './middlewares/base';
import { RootRouter, Router } from './middlewares/router';
import {
    SlicePipe, SortPipe, LowerCasePipe, UpperCasePipe, JsonPipe, DateFormatPipe, ParseStringPipe,
    ParseBoolPipe, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseNumberPipe, DatePipe
} from './pipes'


/**
 * middleware module.
 */
@Module({
    providedIn: 'root',
    providers: [
        MsgRouteVaildator,
        {
            provide: RouteVaildator,
            useExisting: MsgRouteVaildator
        },
        LowerCasePipe, UpperCasePipe, SlicePipe, SortPipe, JsonPipe, DatePipe, DateFormatPipe,
        ParseStringPipe, ParseBoolPipe, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseNumberPipe,
        MessageQueue, Router, RootRouter, RootMessageQueue,
        {
            provide: ContextFactory,
            useValue: BASE_CONTEXT_FACTORY_IMPL
        }
    ]
})
export class MiddlewareModule {

}
