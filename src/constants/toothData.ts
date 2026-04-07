export type SurfaceStatus = 'healthy' | 'caries' | 'filled' | 'missing' | 'impacted';

export interface ToothSurfaceData {
  top: SurfaceStatus;
  bottom: SurfaceStatus;
  left: SurfaceStatus;
  right: SurfaceStatus;
  center: SurfaceStatus;
}

export type ToothStatus = SurfaceStatus; // Keep for backward compatibility if needed

export interface ToothData {
  id: number;
  surfaces: ToothSurfaceData;
  notes?: string;
}

// FDI Tooth Numbering System
export const ADULT_TEETH_TOP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ADULT_TEETH_BOTTOM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const CHILD_TEETH_TOP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const CHILD_TEETH_BOTTOM = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
