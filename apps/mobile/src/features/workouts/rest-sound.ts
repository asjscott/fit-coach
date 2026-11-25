// The rest's beep (#179). The phone apps have no sound module, so there it only vibrates: rest-sound.web.ts beeps on the
// web build

export const hasRestSound = () => false;

export const unlockRestSound = () => {};

export const playRestBeep: (end: boolean) => void = () => {};
