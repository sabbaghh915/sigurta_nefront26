/// <reference types="vite/client" />

declare module 'qrcode' {
    export function toDataURL(text: string, options?: any): Promise<string>;
    // add more if needed
}
