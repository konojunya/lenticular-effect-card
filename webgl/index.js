import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DEBUG = false;
const images = {};
images["image1"] = loadImage("/assets/suisei.png");
images["image2"] = loadImage("/assets/aqua.png");

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = 0;
document.body.style.overflow = "hidden";

const scene = new THREE.Scene();
const geoBack = new THREE.IcosahedronGeometry(10, 2);
const matBack = new THREE.MeshBasicMaterial({
  map: gradientTexture([1, "white"], [0, "#27C7FF"]),
  side: THREE.BackSide,
  depthWrite: false,
  wireframe: DEBUG,
});
var back = new THREE.Mesh(geoBack, matBack);
scene.add(back);

var camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
camera.position.set(0, 0, 2.25);
camera.lookAt(scene.position);

var light1 = new THREE.DirectionalLight("white", 1);
light1.position.set(1, 0, 2);
var light2 = new THREE.DirectionalLight("white", 1);
light2.position.set(-1, 0, 2);
var light3 = new THREE.DirectionalLight("white", 4);
light3.position.set(0, 0, 2);
scene.add(light1, light2, light3);

var canvas = await Promise.all(Object.values(images)).then(sideBySideImage);
var sticker = createLenticularSticker({
  ratio: 1 / 1.2,
  depth: 0.02,
  canvas,
});
scene.add(sticker);

var controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = 10;
controls.minDistance = 1;
controls.minAzimuthAngle = -2;
controls.maxAzimuthAngle = 2;
controls.enableDamping = true;

renderer.setAnimationLoop(animate);

window.addEventListener("resize", onWindowResize, false);
onWindowResize();

// Create a gradient texture
function gradientTexture(...colorStops) {
  var c = document.createElement("canvas");
  c.width = 16;
  c.height = 1024;
  document.body.appendChild(c);
  var ct = c.getContext("2d");
  var gradient = ct.createLinearGradient(0, 0, 0, c.height);
  var i = colorStops.length;
  while (i--) {
    gradient.addColorStop(colorStops[i][0], colorStops[i][1]);
  }
  ct.fillStyle = gradient;
  ct.fillRect(0, 0, c.width, c.height);
  c.style.display = "none";

  const texture = new THREE.CanvasTexture(c);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.offset.set(0, 0);
  texture.repeat.set(2, 1);
  return texture;
}

// Load an image
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); // Create new img element
    img.addEventListener("load", () => resolve(img), false);
    img.src = src;
  });
}

// Draw images onto a canvas, side by side
function sideBySideImage(imgs) {
  const maxWidth = Math.max(...imgs.map(({ width }) => width));
  const maxHeight = Math.max(...imgs.map(({ height }) => height));
  const minRatio = Math.min(...imgs.map(({ width, height }) => width / height));
  const maxRatio = Math.max(...imgs.map(({ width, height }) => width / height));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = maxWidth * imgs.length;
  canvas.height = maxHeight;
  canvas.dataset.itemWidth = maxWidth;
  canvas.dataset.itemHeight = maxHeight;
  canvas.dataset.itemMinRatio = minRatio;
  canvas.dataset.itemMaxRatio = maxRatio;
  canvas.style.display = "none";
  document.body.appendChild(canvas);

  imgs.forEach((img, i) => {
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      i * maxWidth,
      0,
      maxWidth,
      maxHeight
    );
  });

  return canvas;
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onload = function () {
      loadImage(reader.result).then(resolve);
    };
    reader.readAsDataURL(file);
  });
}

function createLenticularSticker({
  ratio = 1,
  depth = 0.05,
  granularity = 200,
  borderRadius = 0.1,
  canvas,
}) {
  const n = granularity;
  var geometry = new THREE.BoxGeometry(
      1,
      1 / ratio,
      depth,
      n,
      1,
      1
    ).toNonIndexed(),
    pos = geometry.getAttribute("position"),
    nor = geometry.getAttribute("normal"),
    uv = geometry.getAttribute("uv");

  var r = borderRadius,
    v = new THREE.Vector3(),
    w = new THREE.Vector3(0, 0, 10.5);

  for (let i = 0; i < pos.count; i++) {
    var x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);

    // round corners
    var k = 0;
    if (x + 0.5 < r) {
      k = r - (x + 0.5);
    }
    if (x - 0.5 > -r) {
      k = r + (x - 0.5);
    }
    k = r - Math.sqrt(r ** 2 - k ** 2);
    y -= k * Math.sign(y);

    // zigzag surface
    if (z > 0) {
      z += (1 + Math.cos(n * x * Math.PI)) / n;
    }
    pos.setXYZ(i, x, y, z);

    // uv coordinates
    var j = i - (n + 1) * 12,
      tri = Math.floor(j / 6),
      step = Math.floor(tri / 2);

    if (j >= 0) {
      var u = uv.getX(i) - step / n;
      if (tri % 2) {
        u += 0.5 - 1 / n;
      }
      uv.setX(i, u);
    }

    // normals
    var nx = nor.getX(i),
      ny = nor.getY(i),
      nz = nor.getZ(i);

    if (nz > 0) {
      v.set(x, y, z);
      v.subVectors(w, v).normalize();
      v.x *= 0.5;
      v.y *= 0.2;
      v.normalize();
      nor.setXYZ(i, v.x, v.y, v.z);
    } else {
      nor.setXYZ(i, 0, 0, 0);
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  let material = new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.8,
    metalness: 1.2,
    iridescence: 0.3,
    wireframe: DEBUG,
  });

  return new THREE.Mesh(geometry, material);
}

function onWindowResize(event) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight, true);
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
}
