declare module 'bun' {
    interface Env {
        RP_ID?: string;

        VOAUTH_HOST: string;
        VOAUTH_CLIENT_ID: string;
        VOAUTH_CLIENT_SECRET: string;
    }
}