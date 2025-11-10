export const Screens = [
    'none',
    'site',
    'navbox',
    'users.admin',
    'config.admin',
    'passkeys.user'
] as const;

export type ScreensT = typeof Screens[number];

export const isScreen = (value: string): value is ScreensT =>
    (Screens as readonly string[]).includes(value);