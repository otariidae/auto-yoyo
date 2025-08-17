import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm";

const DEBUG = false;

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 真横にカメラを配置
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.x = 2;
camera.position.y = 1;
camera.position.z = 0;
camera.lookAt(0, 1, 0);

// 斜め上からライトを当てる
const light = new THREE.SpotLight(0xffffff, 10);
light.position.set(1, 2.5, 1);
light.angle = Math.PI / 4;
light.penumbra = 0.3;
light.target.position.set(0, 1.5, 0);
light.castShadow = true;
scene.add(light);

if (DEBUG) {
  const gridHelper = new THREE.GridHelper(100, 100);
  scene.add(gridHelper);

  const lightHelper = new THREE.SpotLightHelper(light);
  scene.add(lightHelper);
}

// 環境光を追加（影の部分も適度に明るく）
const ambientLight = new THREE.AmbientLight(0x404040, 10);
scene.add(ambientLight);

const handleGeometry = new THREE.BoxGeometry(0.25, 0.1, 0.25);
const handleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
const handle = new THREE.Mesh(handleGeometry, handleMaterial);
handle.castShadow = true;
handle.receiveShadow = true;
scene.add(handle);

const textureLoader = new THREE.TextureLoader();
const yoyoTexture = textureLoader.load("./yoyo-equirectangular.svg");

const radius = 0.1;
const ballGeometry = new THREE.SphereGeometry(radius);
const ballMaterial = new THREE.MeshPhongMaterial({
  map: yoyoTexture,
  transparent: true,
});
const sphere = new THREE.Mesh(ballGeometry, ballMaterial);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

const springGeometry = new THREE.BufferGeometry();
const springMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
const springLine = new THREE.Line(springGeometry, springMaterial);
scene.add(springLine);

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.8, 0),
});

const handleShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.1, 0.25));
const handleBody = new CANNON.Body({
  mass: 0, // 重力を無視するため質量0
  shape: handleShape,
  material: new CANNON.Material({
    restitution: 0.8,
  }),
});

const handleBaseY = 2;
const AMPLITUDE = 0.25;
const FREQUENCY = 1.75;
const t0 = Date.now();

handleBody.position.set(0, handleBaseY, 0);
world.addBody(handleBody);

const sphereBody = new CANNON.Body({
  mass: 0.1,
  shape: new CANNON.Sphere(radius),
  material: new CANNON.Material({
    restitution: 0.7,
  }),
  linearDamping: 0.15,
  angularDamping: 0.25,
});

// ボールの位置をランダムにずらす
const JITTER_RANGE = 0.1;
const jitterX = Math.random() * JITTER_RANGE - JITTER_RANGE / 2;
const jitterZ = Math.random() * JITTER_RANGE - JITTER_RANGE / 2;
sphereBody.position.set(jitterX, 1, jitterZ);
world.addBody(sphereBody);

const spring = new CANNON.Spring(
  handleBody,
  sphereBody,
  {
    restLength: 0.5,
    stiffness: 25,
    damping: 0.8,
    localAnchorA: new CANNON.Vec3(0, 0, 0), // ハンドルの中心
    localAnchorB: new CANNON.Vec3(0, -radius, 0), // ボールの上部
  },
);
world.addEventListener("postStep", () => {
  spring.applyForce();
});

// 接触マテリアルの設定
const contactMaterial = new CANNON.ContactMaterial(
  sphereBody.material,
  handleBody.material,
  {
    friction: 0.6,
    restitution: 0.7,
  },
);
world.addContactMaterial(contactMaterial);

function updateHandlePosition() {
  const t = Date.now();
  const elapsedSec = (t - t0) / 1000;

  // 正弦波の上下運動
  // y = A * sin(2 * pi * f * t)
  const yOffset = AMPLITUDE * Math.sin(2 * Math.PI * FREQUENCY * elapsedSec);

  // ハンドルのy位置を更新
  handleBody.position.y = handleBaseY + yOffset;

  // ハンドルのx, z位置をボールの中心に同期する
  // なお画角から外れないように原点から1メートル圏内に制限
  const MAX_DISTANCE = 1.0; // 1メートル
  const ballX = sphereBody.position.x;
  const ballZ = sphereBody.position.z;

  // 原点からの距離を計算
  const distance = Math.sqrt(ballX * ballX + ballZ * ballZ);

  // 1メートル圏内に制限
  if (distance > MAX_DISTANCE) {
    const scale = MAX_DISTANCE / distance;
    handleBody.position.x = ballX * scale;
    handleBody.position.z = ballZ * scale;
  } else {
    handleBody.position.x = ballX;
    handleBody.position.z = ballZ;
  }
}

function animate() {
  world.fixedStep();

  updateHandlePosition();

  // ボールの位置、回転を更新
  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion);

  // ハンドルの位置、回転を更新
  handle.position.copy(handleBody.position);
  handle.quaternion.copy(handleBody.quaternion);

  // バネの可視化を更新
  const handlePos = handleBody.position;
  const ballPos = sphereBody.position;
  const springPoints = [
    new THREE.Vector3(handlePos.x, handlePos.y, handlePos.z),
    new THREE.Vector3(ballPos.x, ballPos.y, ballPos.z),
  ];
  springGeometry.setFromPoints(springPoints);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
