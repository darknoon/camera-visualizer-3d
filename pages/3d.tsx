import * as THREE from "three";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, GroupProps, MeshProps } from "@react-three/fiber";
import styles from "../styles/3d.module.css";
import {
  Box,
  Environment,
  OrbitControls,
  Plane,
  Torus,
} from "@react-three/drei";
import {
  CameraConfig,
  CameraInfo,
  CameraPosition,
  LensInfo,
  makeCameraConfig,
  Rotation,
} from "../data/PanoramaConfig";
import { BoxGeometry, MathUtils } from "three";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

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
  camera,
  lens,
  angle,
}: {
  isActive: boolean;
  camera: CameraInfo;
  lens: LensInfo;
  angle: CameraPosition;
  makeActive: (active: Coordinate | undefined) => void;
}) => {
  const scale = 3;
  const { sensorWidth, sensorHeight } = camera;
  const lensScale = sensorWidth / lens.focalLength;
  return (
    <>
      <group rotation={panTiltRollToThreeJSEuler(angle.rotation)}>
        <Plane
          position={[0, 0, -scale]}
          rotation={[0, 0, 0]}
          scale={[
            scale * lensScale,
            scale * lensScale * (sensorHeight / sensorWidth),
            1,
          ]}
          onPointerEnter={() => makeActive(angle.coordinate)}
          onPointerLeave={() => makeActive(undefined)}
        >
          <meshBasicMaterial color={isActive ? "#eee" : "#333"} />
        </Plane>
        <Torus
          args={[0.1, 0.01, 8, 64]}
          position={[0, 0, -1]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshStandardMaterial color={isActive ? "yellow" : "gray"} />
        </Torus>
      </group>
    </>
  );
};

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
  [
    [MathUtils.degToRad(-60), 6],
    [0, 6],
    [MathUtils.degToRad(60), 6],
  ]
);

const panTiltRollToThreeJSEuler = (
  rotation: Rotation
): Parameters<THREE.Euler["set"]> => [
  rotation.tilt,
  rotation.pan,
  rotation.roll,
  "YXZ",
];

// const GroundPlane = (props: MeshProps) => {
//   const uniforms = {};
//   const vertex = `
//     varying vec2 vUv;
//   `;
//   return (
//     <Plane>
//       <shaderMaterial
//         attach="material"
//         args={[
//           {
//             uniforms: uniforms,
//             vertexShader: vertex,
//             fragmentShader: fragment,
//           },
//         ]}
//       />
//     </Plane>
//   );
// };

function GroundPlane(props: MeshProps) {
  return (
    <Plane {...props} args={[10, 10]} rotation={[Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color={"black"} side={THREE.DoubleSide} />
    </Plane>
  );
}

const TripodModel = (props: MeshProps) => {
  // Too complicated to use the compressed version it seems
  // Have to find a way to host the draco decoder somwhere in /public/. eh, shouldn't the bundler be doing this?
  /*
  const gltf = useLoader(
    GLTFLoader,
    "/tripod_export.glb",
    (loader: THREE.Loader) => {
      if (loader instanceof GLTFLoader) {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco-gltf/");
        loader.setDRACOLoader(dracoLoader);
      }
    }
  );
  */
  const gltf = useLoader(
    GLTFLoader,
    "/tripod_export.glb",
    undefined,
    (xhr) => console.log(xhr, (xhr.loaded / xhr.total) * 100 + "% loaded") // optional
  );

  return <primitive object={gltf.scene} {...props} />;
};

const PositionsVisualizer = ({
  activePosition,
  makeActive,
}: {
  activePosition: Coordinate | undefined;
  makeActive: MakeActiveFn;
}) => {
  return (
    <group>
      <OrbitControls />
      <ambientLight />

      <pointLight position={[10, 10, 10]} />

      {cameraConfig.angles.map((angle, i) => (
        <CameraPosition
          key={angle.coordinate[0] * 1000 + angle.coordinate[1]}
          isActive={
            activePosition !== undefined &&
            coordinateEqual(angle.coordinate, activePosition)
          }
          angle={angle}
          lens={cameraConfig.lensInfo}
          camera={cameraConfig.cameraInfo}
          makeActive={(activePosition) => makeActive(angle.coordinate)}
        />
      ))}

      <Suspense fallback={<Box />}>
        <TripodModel position={[0, -1.1, 0]} />
      </Suspense>
      {/* <GroundPlane position={[0, -1.1, 0]} /> */}
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
  const degreesFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    []
  );
  const filenameFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-us", {
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
              {degreesFormatter.format(MathUtils.radToDeg(row.tilt))}°)
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
                  >
                    {0}.jpg
                  </li>
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
