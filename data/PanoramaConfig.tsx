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
  angles: CameraPosition[];
}

export function makeCameraConfig(
  cameraInfo: CameraInfo,
  lensInfo: LensInfo,
  exposures: number[] // Number of exposures per row
): CameraConfig {
  const rows = exposures.length;
  const { sensorWidth, sensorHeight } = cameraInfo;
  const { focalLength } = lensInfo;
  // Divide the range between -Math.PI/2 and Math.PI/2 into (rows + 2) divisions.
  const tiltIncr = Math.PI * (1 / (rows + 2));
  const tiltStart = -Math.PI / 2 + tiltIncr;
  const angles: CameraPosition[] = exposures.flatMap((exposureCount, row) =>
    [...range(exposureCount)].map((column) => ({
      rotation: {
        pan: (2 * Math.PI * column) / exposureCount,
        tilt: tiltStart + (Math.PI * row) / rows,
        roll: 0,
      },
      coordinate: [row, column],
    }))
  );

  return {
    rows,
    cameraInfo,
    angles,
  };
}
