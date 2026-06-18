import { Controller, Get, Post, RequestBody, RequestParam } from '@tsdi/service';

@Controller('/request-checks')
export class RequestValidationController {

    @Get('/query')
    queryConvert(
        @RequestParam('age', { pipe: 'int' }) age: number,
        @RequestParam('enabled', { pipe: 'boolean' }) enabled: boolean
    ) {
        return { age, enabled, types: { age: typeof age, enabled: typeof enabled } };
    }

    @Get('/query/defaults')
    queryDefaults(
        @RequestParam('page', { nullable: true, pipe: 'int' }) page: number = 1,
        @RequestParam('sort', { nullable: true }) sort: string = 'name'
    ) {
        return { page, sort };
    }

    @Get('/query/int-required')
    queryIntRequired(@RequestParam('val', { pipe: 'int' }) val: number) {
        return { val, isNumber: typeof val === 'number' };
    }

    @Get('/query/check')
    queryCheck(@RequestParam('check', { nullable: true, pipe: 'boolean' }) check: boolean = false) {
        return { check, type: typeof check };
    }

    @Post('/body')
    bodyConvert(
        @RequestBody('age', { pipe: 'int' }) age: number,
        @RequestBody('enabled', { pipe: 'boolean' }) enabled: boolean
    ) {
        return { age, enabled, types: { age: typeof age, enabled: typeof enabled } };
    }
}
