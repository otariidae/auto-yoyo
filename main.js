import Matter from "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/+esm";

const {
  Engine,
  Render,
  Bodies,
  Body,
  Composite,
  Constraint,
  Runner,
} = Matter;

const canvas = document.getElementById("canvas");
const canvasStyle = getComputedStyle(canvas);
const canvasWidth = canvasStyle.width.replace("px", "");
const canvasHeight = canvasStyle.height.replace("px", "");

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
  canvas,
  engine: engine,
  options: {
    width: canvasWidth,
    height: canvasHeight,
    wireframes: false,
    showAngleIndicator: false,
    showCollisions: false,
    showVelocity: false,
  },
});

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

const handleBaseY = 100;
const handleWidth = 100;
const handle = Bodies.rectangle(100, handleBaseY, handleWidth, 25, {
  density: 0.01,
  isStatic: true,
});

const ball = Bodies.circle(200, 200, 30, {
  density: 0.001,
  centre: { x: 0, y: 5 },
  render: {
    sprite: {
      texture: "./yoyo.svg",
    },
  },
});

const constraint = Constraint.create({
  bodyA: handle,
  pointA: { x: 0, y: 5 },
  bodyB: ball,
  pointB: { x: 0, y: -30 },
  stiffness: 0.002,
});

Composite.add(world, [handle, ball, constraint]);

const AMPLITUDE = 50;
const FREQUENCY = 1;
const t0 = Date.now();

// 上下運動のアニメーション関数
function animateHandle() {
  const t = Date.now();
  const elapsedSec = (t - t0) / 1000;

  // 正弦波の上下運動
  // y = A * sin(2 * pi * f * t)
  const yOffset = AMPLITUDE * Math.sin(2 * Math.PI * FREQUENCY * elapsedSec);

  // handleがworldをはみ出さないように境界チェック
  const worldWidth = render.options.width;
  const minX = handleWidth / 2; // 左端
  const maxX = worldWidth - handleWidth / 2; // 右端

  const xOffset = Math.max(minX, Math.min(maxX, ball.position.x));

  Body.setPosition(handle, {
    x: xOffset,
    y: handleBaseY + yOffset,
  });

  requestAnimationFrame(animateHandle);
}

// アニメーション開始
animateHandle();
