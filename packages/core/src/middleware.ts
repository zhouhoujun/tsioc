import { Module } from './metadata/decor';
import { MappingRouterResolver, Router, RouterResolver } from './middlewares/router';
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
        { provide: RouterResolver, useValue: new MappingRouterResolver() },
        LowerCasePipe, UpperCasePipe, SlicePipe, SortPipe, JsonPipe, DatePipe, DateFormatPipe,
        ParseStringPipe, ParseBoolPipe, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseNumberPipe
    ]
})
export class MiddlewareModule {

}
