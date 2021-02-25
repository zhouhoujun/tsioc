import { Handle, Router } from "@tsdi/boot";

@Handle()
export class CompRouter extends Router {
    constructor() {
        super('', '', 'comp:')
    }
}