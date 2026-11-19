import React from 'react';
import {THEMES, Theme} from '../theme';

export const ThemeCtx = React.createContext<Theme>(THEMES.story);
export const useTheme = () => React.useContext(ThemeCtx);

/** Voice loudness 0..1 for a frame (drives mouths); scenes with their own characters read it from here. */
export const MouthCtx = React.createContext<(frame: number) => number>(() => 0);
