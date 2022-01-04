import { range } from "../util/range";

// All measurements are in milimeters, unless otherwise specified.
export interface CameraInfo {
  sensorWidth: number;
  sensorHeight: number;
}

export interface LensInfo {
  focalLength: number;
  // TODO: vignetting (EV)
  // f-number
}

export interface Rotation {
  pan: number;
  tilt: number;
  roll: number;
}

export interface CameraPosition {
  coordinate: [number, number];
  rotation: Rotation;
}

export interface CameraConfig {
  rows: number;
  cameraInfo: CameraInfo;
  lensInfo: LensInfo;
  angles: CameraPosition[];
}

export function makeCameraConfig(
  cameraInfo: CameraInfo,
  lensInfo: LensInfo,
  exposures: [number, number][] // Number of exposures per row
): CameraConfig {
  const rows = exposures.length;
  // Divide the range between -Math.PI/2 and Math.PI/2 into (rows + 2) divisions.
  const angles: CameraPosition[] = exposures.flatMap(
    ([angle, exposureCount], row) =>
      [...range(exposureCount)].map((column) => ({
        rotation: {
          pan: (2 * Math.PI * column) / exposureCount,
          tilt: angle,
          roll: 0,
        },
        coordinate: [row, column],
      }))
  );

  return {
    rows,
    cameraInfo,
    lensInfo,
    angles,
  };
}
