import * as THREE from "three";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, GroupProps } from "@react-three/fiber";
import styles from "../styles/3d.module.css";
import { Environment, OrbitControls, Plane, Torus } from "@react-three/drei";
import {
  CameraConfig,
  CameraPosition,
  makeCameraConfig,
  Rotation,
} from "../data/PanoramaConfig";
import { MathUtils } from "three";
// import { useLoader } from "@react-three/fiber";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Only renders its children on client
const CanvasSizer = (props: React.PropsWithChildren<{}>) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // update some client side state to say it is now safe to render the client-side only component
    setIsClient(true);
  });

  return (
    <div className={styles.canvasContainer}>
      {isClient ? props.children : null}
    </div>
  );
};

// Render a specific camera position
const CameraPosition = ({
  isActive,
  makeActive,
  coordinate,
  ...rest
}: GroupProps & {
  isActive: boolean;
  coordinate: Coordinate;
  makeActive: (active: Coordinate | undefined) => void;
}) => (
  <>
    <group {...rest}>
      <Plane
        position={[0, 0, -3]}
        rotation={[0, 0, 0]}
        scale={[4, 3, 1]}
        onPointerEnter={() => makeActive(coordinate)}
        onPointerLeave={() => makeActive(undefined)}
      >
        <meshStandardMaterial color={isActive ? "white" : "gray"} />
      </Plane>
      <Torus
        args={[0.3, 0.01, 8, 64]}
        position={[0, 0, -1]}
        rotation={[Math.PI, 0, 0]}
      >
        <meshStandardMaterial color={isActive ? "yellow" : "gray"} />
      </Torus>
    </group>
  </>
);

// Show camera parameters
const Parameters = ({ config: { cameraInfo } }: { config: CameraConfig }) => (
  <div>
    <h3>Parameters</h3>
    <table>
      <tbody>
        <tr>
          <th>Sensor Width</th>
          <td>{cameraInfo.sensorWidth}mm</td>
        </tr>
        <tr>
          <th>Sensor Height</th>
          <td>{cameraInfo.sensorHeight}mm</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const cameraConfig = makeCameraConfig(
  { sensorWidth: 35.6, sensorHeight: 23.8 },
  { focalLength: 18 },
  [3, 6, 3]
);

const panTiltRollToThreeJSEuler = (
  rotation: Rotation
): Parameters<THREE.Euler["set"]> => [
  rotation.tilt,
  rotation.pan,
  rotation.roll,
  "YXZ",
];

const PositionsVisualizer = ({
  activePosition,
  makeActive,
}: {
  activePosition: Coordinate | undefined;
  makeActive: MakeActiveFn;
}) => {
  // const gltf = useLoader(GLTFLoader, "/tripod_export.glb");
  //   return (
  //     <Suspense fallback={null}>
  //       <primitive object={gltf.scene} />
  //     </Suspense>
  //   );

  return (
    <group>
      <OrbitControls />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      {/* <primitive object={gltf.scene} /> */}

      {cameraConfig.angles.map((angle, i) => (
        <CameraPosition
          rotation={panTiltRollToThreeJSEuler(angle.rotation)}
          key={angle.coordinate[0] * 1000 + angle.coordinate[1]}
          isActive={
            activePosition !== undefined &&
            coordinateEqual(angle.coordinate, activePosition)
          }
          coordinate={angle.coordinate}
          makeActive={(activePosition) => makeActive(angle.coordinate)}
        />
      ))}
    </group>
  );
};

interface Coordinate {
  [0]: number;
  [1]: number;
}

function coordinateEqual(a: Coordinate, b: Coordinate): boolean {
  return a[0] == b[0] && a[1] == b[1];
}

type MakeActiveFn = (activePosition: Coordinate | undefined) => void;
type ByRow = { tilt: number; angles: CameraPosition[] }[];

const ShotsView = ({
  byRow,
  makeActive,
  active,
}: {
  byRow: ByRow;
  active: Coordinate | undefined;
  makeActive: MakeActiveFn;
}) => {
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    []
  );

  return (
    <div>
      <h3>Shots</h3>
      <div className={styles.cameraImages}>
        {byRow.map((row, rowIndex) => (
          <section key={`row-${rowIndex}`}>
            <h4>
              Row {rowIndex} (
              {numberFormatter.format(MathUtils.radToDeg(row.tilt))}°)
            </h4>
            <ol>
              {byRow[rowIndex].angles.map((angle, i) => {
                const isActive =
                  active && coordinateEqual(active, angle.coordinate);
                return (
                  <li
                    key={`angle-${JSON.stringify(angle.coordinate)}`}
                    className={[
                      styles.cameraImage,
                      isActive ? styles.cameraImageActive : "",
                    ].join(" ")}
                    onPointerOver={() => makeActive(angle.coordinate)}
                    onPointerOut={() => makeActive(undefined)}
                  ></li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
};

const Page = () => {
  const byRow = cameraConfig.angles.reduce((acc, angle, i) => {
    let struct = acc[angle.coordinate[0]] ?? {
      tilt: angle.rotation.tilt,
      angles: [],
    };
    struct.angles.push(angle);
    acc[angle.coordinate[0]] = struct;
    return acc;
  }, [] as ByRow);

  const [active, makeActive] = useState<Coordinate | undefined>();

  return (
    <div className={styles.wrapper}>
      <CanvasSizer>
        <Canvas dpr={[1, 3]}>
          <PositionsVisualizer
            activePosition={active}
            makeActive={makeActive}
          />
        </Canvas>
      </CanvasSizer>
      <div className={styles.sidebar}>
        <Parameters config={cameraConfig} />
        <ShotsView byRow={byRow} active={active} makeActive={makeActive} />
      </div>
    </div>
  );
};

export default Page;
