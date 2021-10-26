import { ContextFactory, RouteVaildator } from './context';
import { Module } from '../metadata/decor';
import { MessageQueue } from './queue';
import { RootMessageQueue } from './root';
import { MsgRouteVaildator, BASE_CONTEXT_FACTORY_IMPL } from './base';
import { RootRouter, Router } from './router';
import {
    SlicePipe, LowerCasePipe, UpperCasePipe, JsonPipe, DateFormatPipe, ParseStringPipe,
    ParseBoolPipe, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseNumberPipe, DatePipe
} from '../pipes'


/**
* router module.
*/
@Module({
    regIn: 'root',
    providers: [
        MsgRouteVaildator,
        {
            provide: RouteVaildator,
            useExisting: MsgRouteVaildator
        },
        LowerCasePipe, UpperCasePipe, JsonPipe, DatePipe, DateFormatPipe, ParseStringPipe,
        ParseBoolPipe, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseNumberPipe, SlicePipe,
        MessageQueue, Router, RootRouter, RootMessageQueue,
        {
            provide: ContextFactory,
            useValue: BASE_CONTEXT_FACTORY_IMPL
        }
    ]
})
export class MiddlewareModule {

}
