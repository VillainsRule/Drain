declare module 'bun' {
    interface Env {
        VOAUTH_HOST: string;
        VOAUTH_CLIENT_ID: string;
        VOAUTH_CLIENT_SECRET: string;
    }
}