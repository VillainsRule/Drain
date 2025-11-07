export const Screens = [
    'none',
    'site',
    'users.admin',
    'config.admin'
] as const;

export type ScreensT = typeof Screens[number];

export const isScreen = (value: string): value is ScreensT =>
    (Screens as readonly string[]).includes(value);