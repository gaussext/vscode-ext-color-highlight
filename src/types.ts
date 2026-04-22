export interface ColorMatch {
  start: number;
  end: number;
  color: string;
}

export interface ImporterOptions {
  cwd?: string;
  extensions?: string[];
  includePaths?: string[];
  globalPaths?: string[];
  data?: string;
}

export interface ViewConfig {
  enable: boolean;
  languages: string[];
  matchWords: boolean;
  useARGB: boolean;
  matchRgbWithNoFunction: boolean;
  rgbWithNoFunctionLanguages: string[];
  matchHslWithNoFunction: boolean;
  hslWithNoFunctionLanguages: string[];
  markerType: string;
  markRuler: boolean;
  includePaths: string[];
  globalPaths: string[];
}