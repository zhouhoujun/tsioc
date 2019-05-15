

export abstract class BindingExpression<T> {
    protected prefix: string;
    abstract resolve(scope: any): T;
}


export class AssignBinding<T> extends BindingExpression<T> {
    constructor(protected fieldName: string, prefix = 'binding:') {
        super();
    }
    resolve(scope: any): T {
        if (scope) {
            return scope[this.fieldName] as T;
        }
        return null;
    }
}

/**
 * binding
 */
export type Binding<T> =  string | BindingExpression<T> | T;
