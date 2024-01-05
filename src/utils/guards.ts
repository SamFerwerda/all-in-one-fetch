export function isDOMException(error: unknown){
    return error && error instanceof DOMException;
}