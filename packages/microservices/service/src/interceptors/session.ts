export abstract class SessionInterceptor {
    abstract intercept(input: any, next: any, context: any): any;
}
