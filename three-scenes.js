import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function getThemePalette() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return dark
    ? { bg: 0x0f1216, floor: 0x161b21, fog: 0x0f1216, metal: 0x9aa4b0, darkMetal: 0x262c34, glass: 0x8fb8cc, amb: 0xd8e2ec, key: 0xfff5e4, rim: 0x6cb0c7 }
    : { bg: 0xf1efe9, floor: 0xe6e3da, fog: 0xf1efe9, metal: 0x5c646d, darkMetal: 0x2f353c, glass: 0x6a95ab, amb: 0xffffff, key: 0xfffaf0, rim: 0x3b7a57 };
}

function buildGreenhouseScene(scene, pal, quality) {
  const root = new THREE.Group();
  scene.add(root);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.8, 0.16, 48),
    new THREE.MeshStandardMaterial({ color: pal.floor, roughness: 0.88, metalness: 0.08 })
  );
  floor.position.y = -0.08;
  floor.receiveShadow = true;
  root.add(floor);

  const frameMat = new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.35, metalness: 0.78 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: pal.glass,
    transparent: true,
    opacity: 0.19,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const W = 4.2, D = 3.2, H = 2.0, R = 1.15;
  const postGeo = new THREE.BoxGeometry(0.08, H, 0.08);
  [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [0, -D / 2], [0, D / 2]].forEach(([x, z]) => {
    const p = new THREE.Mesh(postGeo, frameMat);
    p.position.set(x, H / 2, z);
    p.castShadow = true;
    root.add(p);
  });

  const beamX = new THREE.BoxGeometry(W + 0.08, 0.07, 0.07);
  [[-D / 2, 0.04], [D / 2, 0.04], [-D / 2, H], [D / 2, H], [0, H + R]].forEach(([z, y]) => {
    const b = new THREE.Mesh(beamX, frameMat);
    b.position.set(0, y, z);
    root.add(b);
  });

  const beamZ = new THREE.BoxGeometry(0.07, 0.07, D + 0.08);
  [[-W / 2, 0.04], [W / 2, 0.04], [-W / 2, H], [W / 2, H]].forEach(([x, y]) => {
    const b = new THREE.Mesh(beamZ, frameMat);
    b.position.set(x, y, 0);
    root.add(b);
  });

  const rafterLen = Math.hypot(D / 2, R);
  const rafterAngle = Math.atan2(R, D / 2);
  const rafterGeo = new THREE.BoxGeometry(0.07, 0.07, rafterLen);
  [-W / 2, 0, W / 2].forEach((x) => {
    [-1, 1].forEach((dir) => {
      const rf = new THREE.Mesh(rafterGeo, frameMat);
      rf.position.set(x, H + R / 2, (dir * D) / 4);
      rf.rotation.x = dir * rafterAngle;
      root.add(rf);
    });
  });

  const wallFront = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glassMat);
  wallFront.position.set(0, H / 2, D / 2);
  root.add(wallFront);
  const wallBack = wallFront.clone();
  wallBack.position.z = -D / 2;
  root.add(wallBack);
  const wallSideGeo = new THREE.PlaneGeometry(D, H);
  [-W / 2, W / 2].forEach((x) => {
    const ws = new THREE.Mesh(wallSideGeo, glassMat);
    ws.position.set(x, H / 2, 0);
    ws.rotation.y = Math.PI / 2;
    root.add(ws);
  });

  const roofSlopeGeo = new THREE.PlaneGeometry(W, rafterLen);
  const roofBack = new THREE.Mesh(roofSlopeGeo, glassMat);
  roofBack.position.set(0, H + R / 2, -D / 4);
  roofBack.rotation.x = -(Math.PI / 2 - rafterAngle);
  root.add(roofBack);

  const roofFrontLeft = new THREE.Mesh(new THREE.PlaneGeometry(W / 2, rafterLen), glassMat);
  roofFrontLeft.position.set(-W / 4, H + R / 2, D / 4);
  roofFrontLeft.rotation.x = Math.PI / 2 - rafterAngle;
  root.add(roofFrontLeft);

  const ventPivot = new THREE.Group();
  ventPivot.position.set(W / 4, H + R, 0);
  root.add(ventPivot);
  const ventPanel = new THREE.Group();
  const ventGlass = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 0.16, rafterLen - 0.14), new THREE.MeshPhysicalMaterial({ color: 0x74c698, transparent: true, opacity: 0.28, roughness: 0.1, side: THREE.DoubleSide }));
  ventGlass.position.set(0, -R / 2, D / 4);
  ventGlass.rotation.x = Math.PI / 2 - rafterAngle;
  ventPanel.add(ventGlass);
  const ventRim = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.12, 0.05, 0.05), frameMat);
  ventRim.position.set(0, -R + 0.05, D / 2 - 0.05);
  ventPanel.add(ventRim);
  ventPivot.add(ventPanel);

  const servoBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.12), new THREE.MeshStandardMaterial({ color: 0x2d6678, roughness: 0.4, metalness: 0.3 }));
  servoBody.position.set(W / 4 + 0.72, H + R - 0.28, 0.24);
  root.add(servoBody);

  const bedBox = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.38, 2.2), new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.6, metalness: 0.3 }));
  bedBox.position.set(-0.45, 0.19, 0);
  bedBox.castShadow = true;
  bedBox.receiveShadow = true;
  root.add(bedBox);

  const soilMat = new THREE.MeshStandardMaterial({ color: 0x5c3e2b, roughness: 0.92, metalness: 0.02 });
  const soilMesh = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.12, 2.04), soilMat);
  soilMesh.position.set(-0.45, 0.39, 0);
  soilMesh.receiveShadow = true;
  root.add(soilMesh);

  const plants = [];
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d52, roughness: 0.55, metalness: 0.04, side: THREE.DoubleSide });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3b6e45, roughness: 0.7 });
  [[-1.2, -0.48], [-0.45, -0.45], [0.3, -0.48], [-1.2, 0.45], [-0.45, 0.48], [0.3, 0.45]].forEach(([px, pz], idx) => {
    const pg = new THREE.Group();
    pg.position.set(px, 0.44, pz);
    const h = 0.48 + (idx % 3) * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, h, 8), stemMat);
    stem.position.y = h / 2;
    stem.castShadow = true;
    pg.add(stem);
    for (let l = 0; l < 5; l++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), leafMat);
      leaf.scale.set(1.5, 0.2, 0.85);
      const ang = (l / 5) * Math.PI * 2 + idx;
      const ly = h * (0.45 + (l % 3) * 0.22);
      leaf.position.set(Math.cos(ang) * 0.15, ly, Math.sin(ang) * 0.15);
      leaf.rotation.set(0.32, -ang, 0.24);
      leaf.castShadow = true;
      pg.add(leaf);
    }
    root.add(pg);
    plants.push({ g: pg, phase: idx * 1.1 });
  });

  const soilProbe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.02), new THREE.MeshStandardMaterial({ color: 0x1e5c3e, roughness: 0.4, metalness: 0.5 }));
  soilProbe.position.set(0.55, 0.52, 0.65);
  root.add(soilProbe);

  const tankGroup = new THREE.Group();
  tankGroup.position.set(1.42, 0.02, 0.55);
  root.add(tankGroup);
  const tankWall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 1.25, 28, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0x9ecae1, transparent: true, opacity: 0.24, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false })
  );
  tankWall.position.y = 0.625;
  tankGroup.add(tankWall);
  const tankRingGeo = new THREE.TorusGeometry(0.46, 0.022, 10, 28);
  [0.02, 1.25].forEach((y) => {
    const tr = new THREE.Mesh(tankRingGeo, frameMat);
    tr.rotation.x = Math.PI / 2;
    tr.position.y = y;
    tankGroup.add(tr);
  });

  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x3b8ea5, transparent: true, opacity: 0.72, roughness: 0.15, metalness: 0.05 });
  const waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 1.14, 24), waterMat);
  waterMesh.position.y = 0.57;
  tankGroup.add(waterMesh);

  const hcBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), new THREE.MeshStandardMaterial({ color: 0x215575, roughness: 0.35, metalness: 0.4 }));
  hcBody.position.set(0, 1.32, 0);
  tankGroup.add(hcBody);

  const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 16), new THREE.MeshStandardMaterial({ color: 0x262c34, roughness: 0.4, metalness: 0.65 }));
  pumpBody.rotation.z = Math.PI / 2;
  pumpBody.position.set(1.42, 0.18, -0.35);
  root.add(pumpBody);

  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.42, 0.18, 0.15),
    new THREE.Vector3(1.42, 0.18, -0.35),
    new THREE.Vector3(1.25, 0.72, -0.35),
    new THREE.Vector3(0.75, 0.92, 0),
    new THREE.Vector3(-1.35, 0.92, 0),
  ]);
  const pipeMesh = new THREE.Mesh(
    new THREE.TubeGeometry(pipeCurve, 32, 0.028, 10, false),
    new THREE.MeshStandardMaterial({ color: 0x8ca2ad, transparent: true, opacity: 0.65, roughness: 0.2 })
  );
  root.add(pipeMesh);

  const dropCount = quality === 'low' ? 18 : 42;
  const dropGeo = new THREE.BufferGeometry();
  const dropPos = new Float32Array(dropCount * 3);
  const dropPhase = new Float32Array(dropCount);
  for (let i = 0; i < dropCount; i++) {
    dropPhase[i] = Math.random();
    dropPos[i * 3] = -1.2 + Math.random() * 1.6;
    dropPos[i * 3 + 1] = 0.45 + Math.random() * 0.45;
    dropPos[i * 3 + 2] = (Math.random() - 0.5) * 1.1;
  }
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
  const dropMat = new THREE.PointsMaterial({ color: 0x6cb0c7, size: 0.065, transparent: true, opacity: 0 });
  const drops = new THREE.Points(dropGeo, dropMat);
  root.add(drops);

  const fanGroup = new THREE.Group();
  fanGroup.position.set(-W / 2 + 0.06, 1.35, 0);
  fanGroup.rotation.y = Math.PI / 2;
  root.add(fanGroup);
  const fanHousing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 10, 24), frameMat);
  fanGroup.add(fanHousing);
  const fanRotor = new THREE.Group();
  fanGroup.add(fanRotor);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 14), frameMat);
  hub.rotation.x = Math.PI / 2;
  fanRotor.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.26, 0.075, 0.015);
  const bladeMat = new THREE.MeshStandardMaterial({ color: pal.metal, roughness: 0.35, metalness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const bWrap = new THREE.Group();
    bWrap.rotation.z = (i / 6) * Math.PI * 2;
    const b = new THREE.Mesh(bladeGeo, bladeMat);
    b.position.x = 0.18;
    b.rotation.x = 0.42;
    bWrap.add(b);
    fanRotor.add(bWrap);
  }

  const lampGroup = new THREE.Group();
  lampGroup.position.set(-0.45, H + R - 0.36, 0);
  root.add(lampGroup);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.24, 24, 1, true), frameMat);
  lampGroup.add(lampShade);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xffb84d, emissiveIntensity: 0, roughness: 0.2 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), bulbMat);
  bulb.position.y = -0.1;
  lampGroup.add(bulb);
  const lampLight = new THREE.PointLight(0xffcb78, 0, 7.5, 1.5);
  lampLight.position.set(-0.45, H + R - 0.55, 0);
  root.add(lampLight);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffd280, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const lightCone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 24, 1, true), coneMat);
  lightCone.position.y = -1.25;
  lampGroup.add(lightCone);

  const dhtNode = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.08), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.45 }));
  dhtNode.position.set(0, 1.6, -D / 2 + 0.08);
  root.add(dhtNode);

  const moteCount = quality === 'low' ? 24 : 56;
  const moteGeo = new THREE.BufferGeometry();
  const motePos = new Float32Array(moteCount * 3);
  const moteSeed = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    moteSeed[i] = Math.random() * Math.PI * 2;
    motePos[i * 3] = (Math.random() - 0.5) * (W - 0.5);
    motePos[i * 3 + 1] = 0.5 + Math.random() * (H + 0.4);
    motePos[i * 3 + 2] = (Math.random() - 0.5) * (D - 0.5);
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: 0x9fd8b5, size: 0.042, transparent: true, opacity: 0.48 });
  const motes = new THREE.Points(moteGeo, moteMat);
  root.add(motes);

  const state = { water: 0, vent: 0, fanSpeed: 0, lamp: 0, soil: 0.4 };

  const presets = {
    all: { pos: [5.4, 3.6, 5.8], target: [0, 1.15, 0] },
    vent: { pos: [2.8, 3.8, 3.2], target: [0.8, 2.5, 0.2] },
    water: { pos: [3.4, 2.1, 3.0], target: [1.35, 0.7, 0.35] },
    lamp: { pos: [1.8, 2.6, 3.4], target: [-0.45, 2.0, 0] },
    soil: { pos: [-2.4, 2.2, 3.2], target: [-0.45, 0.65, 0] },
  };

  return {
    presets,
    update(dt, elapsed, data) {
      const targetWater = data.waterLevel >= 0 ? clamp(data.waterLevel / 100, 0.03, 1) : 0.03;
      state.water = lerp(state.water, targetWater, dt * 4.5);
      waterMesh.scale.y = state.water;
      waterMesh.position.y = (1.14 * state.water) / 2 + 0.03;

      const targetVent = data.servo ? 0.68 : 0;
      state.vent = lerp(state.vent, targetVent, dt * 4.8);
      ventPanel.rotation.x = -state.vent;

      const targetFan = data.fan ? 16 : 0;
      state.fanSpeed = lerp(state.fanSpeed, targetFan, dt * (data.fan ? 2.8 : 1.15));
      fanRotor.rotation.z -= state.fanSpeed * dt;

      const targetLamp = data.lamp ? 1 : 0;
      state.lamp = lerp(state.lamp, targetLamp, dt * 4.5);
      bulbMat.emissiveIntensity = state.lamp * 2.6;
      lampLight.intensity = state.lamp * 5.0;
      coneMat.opacity = state.lamp * 0.13;

      const targetSoil = data.soilMoisture >= 0 ? clamp(data.soilMoisture / 100, 0, 1) : 0.3;
      state.soil = lerp(state.soil, targetSoil, dt * 3.5);
      const dryC = new THREE.Color(0x9b7653);
      const wetC = new THREE.Color(0x3a2618);
      soilMat.color.lerpColors(dryC, wetC, state.soil);
      soilMat.roughness = lerp(0.95, 0.42, state.soil);

      const pumpActive = !!data.pump;
      dropMat.opacity = lerp(dropMat.opacity, pumpActive ? 0.88 : 0, dt * 5);
      if (dropMat.opacity > 0.02) {
        const pos = dropGeo.attributes.position;
        for (let i = 0; i < dropCount; i++) {
          dropPhase[i] = (dropPhase[i] + dt * 1.05) % 1;
          pos.setY(i, 0.9 - dropPhase[i] * 0.48);
        }
        pos.needsUpdate = true;
      }

      const windAmp = 0.018 + (state.fanSpeed / 16) * 0.075;
      plants.forEach((p) => {
        p.g.rotation.z = Math.sin(elapsed * (2.0 + state.fanSpeed * 0.28) + p.phase) * windAmp;
      });

      const mPos = moteGeo.attributes.position;
      const driftX = 0.08 + (state.fanSpeed / 16) * 0.95;
      moteMat.color.lerpColors(new THREE.Color(0x9fd8b5), new THREE.Color(0xffd78a), state.lamp);
      moteMat.opacity = 0.38 + state.lamp * 0.32;
      for (let i = 0; i < moteCount; i++) {
        let mx = mPos.getX(i) + dt * driftX;
        if (mx > W / 2 - 0.25) mx = -W / 2 + 0.25;
        const my = mPos.getY(i) + Math.sin(elapsed * 1.4 + moteSeed[i]) * dt * 0.14;
        mPos.setXY(i, mx, clamp(my, 0.5, H + 0.5));
      }
      mPos.needsUpdate = true;
    },
  };
}

function buildWaterScene(scene, pal, quality) {
  const root = new THREE.Group();
  scene.add(root);

  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 3.0), new THREE.MeshStandardMaterial({ color: pal.floor, roughness: 0.85 }));
  base.position.y = -0.09;
  base.receiveShadow = true;
  root.add(base);

  const frameMat = new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.35, metalness: 0.78 });
  const tankGroup = new THREE.Group();
  tankGroup.position.set(-0.9, 0, 0);
  root.add(tankGroup);

  const tankH = 2.4, tankR = 0.95;
  const glassWall = new THREE.Mesh(
    new THREE.CylinderGeometry(tankR, tankR, tankH, 40, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xa7d3e8, transparent: true, opacity: 0.22, roughness: 0.06, side: THREE.DoubleSide, depthWrite: false })
  );
  glassWall.position.y = tankH / 2;
  tankGroup.add(glassWall);

  [0.03, tankH].forEach((y) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(tankR, 0.038, 12, 40), frameMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    tankGroup.add(rim);
  });

  for (let i = 1; i <= 4; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.02), frameMat);
    tick.position.set(0, (i / 5) * tankH, tankR + 0.015);
    tankGroup.add(tick);
  }

  const waterBody = new THREE.Mesh(
    new THREE.CylinderGeometry(tankR - 0.05, tankR - 0.05, tankH - 0.14, 36),
    new THREE.MeshPhysicalMaterial({ color: 0x2f85a0, transparent: true, opacity: 0.74, roughness: 0.12, metalness: 0.05 })
  );
  tankGroup.add(waterBody);

  const segs = quality === 'low' ? 14 : 26;
  const surfGeo = new THREE.CircleGeometry(tankR - 0.05, segs);
  surfGeo.rotateX(-Math.PI / 2);
  const surfBaseY = new Float32Array(surfGeo.attributes.position.count);
  const surfMesh = new THREE.Mesh(
    surfGeo,
    new THREE.MeshPhysicalMaterial({ color: 0x6cb0c7, transparent: true, opacity: 0.85, roughness: 0.08, side: THREE.DoubleSide })
  );
  tankGroup.add(surfMesh);

  const hcMount = new THREE.Group();
  hcMount.position.set(0, tankH + 0.14, 0);
  tankGroup.add(hcMount);
  hcMount.add(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.26, 0.14), new THREE.MeshStandardMaterial({ color: 0x1d4e6b, roughness: 0.4, metalness: 0.35 })));
  [-0.2, 0.2].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 20), new THREE.MeshStandardMaterial({ color: pal.metal, roughness: 0.25, metalness: 0.85 }));
    eye.position.set(x, -0.14, 0);
    hcMount.add(eye);
  });

  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.12, 24),
    new THREE.MeshBasicMaterial({ color: 0x6cb0c7, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  );
  pulseRing.rotation.x = Math.PI / 2;
  pulseRing.position.set(0, tankH - 0.15, 0);
  tankGroup.add(pulseRing);

  const pumpGroup = new THREE.Group();
  pumpGroup.position.set(1.25, 0.38, 0);
  root.add(pumpGroup);
  const pumpShell = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.72, 24), frameMat);
  pumpShell.rotation.z = Math.PI / 2;
  pumpShell.castShadow = true;
  pumpGroup.add(pumpShell);
  const pumpHead = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0x2d6678, roughness: 0.35, metalness: 0.5 }));
  pumpHead.rotation.z = Math.PI / 2;
  pumpHead.position.x = -0.34;
  pumpGroup.add(pumpHead);
  const pumpLedMat = new THREE.MeshStandardMaterial({ color: 0x74c698, emissive: 0x74c698, emissiveIntensity: 0 });
  const pumpLed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), pumpLedMat);
  pumpLed.position.set(0.1, 0.36, 0.18);
  pumpGroup.add(pumpLed);

  const inCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, 0.38, 0),
    new THREE.Vector3(0.45, 0.38, 0),
    new THREE.Vector3(0.85, 0.38, 0),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(inCurve, 20, 0.08, 12, false), new THREE.MeshPhysicalMaterial({ color: 0x90b4c4, transparent: true, opacity: 0.5, roughness: 0.15 })));

  const outCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.25, 0.72, 0),
    new THREE.Vector3(1.25, 1.85, 0),
    new THREE.Vector3(2.15, 2.0, 0),
    new THREE.Vector3(2.25, 1.55, 0),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(outCurve, 28, 0.075, 12, false), new THREE.MeshPhysicalMaterial({ color: 0x90b4c4, transparent: true, opacity: 0.55, roughness: 0.15 })));

  const flowCount = quality === 'low' ? 28 : 64;
  const flowGeo = new THREE.BufferGeometry();
  const flowPos = new Float32Array(flowCount * 3);
  const flowT = new Float32Array(flowCount);
  for (let i = 0; i < flowCount; i++) flowT[i] = i / flowCount;
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
  const flowMat = new THREE.PointsMaterial({ color: 0x74d4f2, size: 0.1, transparent: true, opacity: 0 });
  root.add(new THREE.Points(flowGeo, flowMat));

  const sprayCount = quality === 'low' ? 24 : 52;
  const sprayGeo = new THREE.BufferGeometry();
  const sprayPos = new Float32Array(sprayCount * 3);
  const sprayPh = new Float32Array(sprayCount);
  for (let i = 0; i < sprayCount; i++) sprayPh[i] = Math.random();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const sprayMat = new THREE.PointsMaterial({ color: 0x6cb0c7, size: 0.075, transparent: true, opacity: 0 });
  root.add(new THREE.Points(sprayGeo, sprayMat));

  const st = { level: 0.05, active: 0 };
  return {
    presets: { all: { pos: [3.8, 2.5, 4.6], target: [0.3, 1.1, 0] } },
    update(dt, elapsed, data) {
      const tgt = data.waterLevel >= 0 ? clamp(data.waterLevel / 100, 0.04, 1) : 0.04;
      st.level = lerp(st.level, tgt, dt * 3);
      const h = (tankH - 0.16) * st.level;
      waterBody.scale.y = st.level;
      waterBody.position.y = h / 2 + 0.04;
      surfMesh.position.y = h + 0.04;

      const sp = surfGeo.attributes.position;
      const amp = data.pump ? 0.036 : 0.015;
      for (let i = 0; i < sp.count; i++) {
        const x = sp.getX(i), z = sp.getZ(i);
        sp.setY(i, surfBaseY[i] + Math.sin(x * 5 + elapsed * 3.5) * amp + Math.cos(z * 5 + elapsed * 2.8) * amp);
      }
      sp.needsUpdate = true;

      const pr = (elapsed * 0.85) % 1;
      pulseRing.position.y = lerp(tankH - 0.1, h + 0.1, pr);
      pulseRing.scale.setScalar(1 + pr * 2.4);
      pulseRing.material.opacity = (1 - pr) * 0.35;

      st.active = lerp(st.active, data.pump ? 1 : 0, dt * 4);
      pumpLedMat.emissiveIntensity = st.active * 2.5;
      flowMat.opacity = st.active * 0.9;
      sprayMat.opacity = st.active * 0.85;
      if (st.active > 0.02) {
        pumpGroup.position.x = 1.25 + Math.sin(elapsed * 45) * 0.008 * st.active;
        const fp = flowGeo.attributes.position;
        for (let i = 0; i < flowCount; i++) {
          flowT[i] = (flowT[i] + dt * 0.75) % 1;
          const pt = outCurve.getPoint(flowT[i]);
          fp.setXYZ(i, pt.x, pt.y, pt.z);
        }
        fp.needsUpdate = true;

        const dr = sprayGeo.attributes.position;
        for (let i = 0; i < sprayCount; i++) {
          sprayPh[i] = (sprayPh[i] + dt * 1.15) % 1;
          const ang = i * 2.399;
          const r = sprayPh[i] * 0.42;
          dr.setXYZ(i, 2.25 + Math.cos(ang) * r, 1.52 - sprayPh[i] * sprayPh[i] * 1.48, Math.sin(ang) * r);
        }
        dr.needsUpdate = true;
      }
    },
  };
}

function buildServoScene(scene, pal) {
  const root = new THREE.Group();
  scene.add(root);

  const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 3.0), new THREE.MeshStandardMaterial({ color: pal.floor, roughness: 0.88 }));
  base.position.y = -0.08;
  base.receiveShadow = true;
  root.add(base);

  const metalMat = new THREE.MeshStandardMaterial({ color: pal.metal, roughness: 0.3, metalness: 0.82 });
  const darkMat = new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.42, metalness: 0.65 });
  const servoBlue = new THREE.MeshPhysicalMaterial({ color: 0x26658c, transparent: true, opacity: 0.86, roughness: 0.2, metalness: 0.1 });

  const mount = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.8), darkMat);
  mount.position.set(-0.95, 0.45, 0);
  mount.castShadow = true;
  root.add(mount);

  const servoCase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.56), servoBlue);
  servoCase.position.set(-0.95, 1.2, 0);
  servoCase.castShadow = true;
  root.add(servoCase);

  const flange = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.1, 0.56), servoBlue);
  flange.position.set(-0.95, 1.45, 0);
  root.add(flange);

  const gearCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.24, 24), servoBlue);
  gearCap.position.set(-0.72, 1.82, 0);
  root.add(gearCap);

  const gearVis = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14), metalMat);
  gearVis.position.set(-0.72, 1.82, 0);
  root.add(gearVis);

  const hornPivot = new THREE.Group();
  hornPivot.position.set(-0.72, 1.98, 0);
  root.add(hornPivot);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.35 }));
  hornPivot.add(shaft);

  const hornArm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.09, 0.18), new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.35 }));
  hornArm.position.set(0.42, 0.04, 0);
  hornArm.castShadow = true;
  hornPivot.add(hornArm);

  const arcRing = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1.01, 24, 1, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x74c698, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  arcRing.rotation.x = -Math.PI / 2;
  arcRing.position.set(-0.72, 1.96, 0);
  root.add(arcRing);

  const ventFrame = new THREE.Group();
  ventFrame.position.set(1.05, 1.15, 0);
  root.add(ventFrame);
  const fTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.5), darkMat);
  fTop.position.y = -0.65;
  ventFrame.add(fTop);

  const hinge = new THREE.Group();
  hinge.position.set(0.25, 1.2, 0);
  root.add(hinge);

  const louvreFrame = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 1.38), metalMat);
  louvreFrame.position.set(0.82, 0, 0);
  louvreFrame.castShadow = true;
  hinge.add(louvreFrame);

  const louvreGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.03, 1.2),
    new THREE.MeshPhysicalMaterial({ color: 0x74c698, transparent: true, opacity: 0.32, roughness: 0.08 })
  );
  louvreGlass.position.set(0.82, 0, 0);
  hinge.add(louvreGlass);

  const rodMat = new THREE.MeshStandardMaterial({ color: pal.metal, roughness: 0.25, metalness: 0.85 });
  const pushRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 10), rodMat);
  root.add(pushRod);

  const st = { ang: 0 };
  return {
    presets: { all: { pos: [3.2, 3.0, 4.1], target: [0.15, 1.25, 0] } },
    update(dt, _el, data) {
      const target = data.servo ? Math.PI / 2 : 0;
      st.ang = lerp(st.ang, target, dt * 3.8);
      hornPivot.rotation.y = st.ang;
      gearVis.rotation.y = st.ang * 3;
      hinge.rotation.z = (st.ang / (Math.PI / 2)) * 0.72;

      const p1 = new THREE.Vector3(-0.72 + Math.cos(st.ang) * 0.82, 2.02, -Math.sin(st.ang) * 0.82);
      const p2 = new THREE.Vector3(0.25 + Math.cos(hinge.rotation.z) * 0.9, 1.2 + Math.sin(hinge.rotation.z) * 0.9, 0);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      pushRod.position.copy(mid);
      pushRod.scale.set(1, dist, 1);
      pushRod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    },
  };
}

function buildFanScene(scene, pal, quality) {
  const root = new THREE.Group();
  scene.add(root);

  const frameMat = new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.38, metalness: 0.72 });
  const metalMat = new THREE.MeshStandardMaterial({ color: pal.metal, roughness: 0.28, metalness: 0.82 });

  const stand = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 2.2), new THREE.MeshStandardMaterial({ color: pal.floor, roughness: 0.88 }));
  stand.position.y = -1.55;
  stand.receiveShadow = true;
  root.add(stand);

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.14, 16, 48), frameMat);
  outerRing.castShadow = true;
  root.add(outerRing);

  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.52, 40, 1, true), frameMat);
  shroud.rotation.x = Math.PI / 2;
  root.add(shroud);

  [[-1.18, -1.18], [1.18, -1.18], [-1.18, 1.18], [1.18, 1.18]].forEach(([x, y]) => {
    const corner = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.42, 16), frameMat);
    corner.rotation.x = Math.PI / 2;
    corner.position.set(x, y, 0);
    root.add(corner);
  });

  [0.45, 0.82, 1.14].forEach((r) => {
    const grill = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 8, 40), metalMat);
    grill.position.z = 0.27;
    root.add(grill);
  });
  for (let i = 0; i < 4; i++) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.025, 0.025), metalMat);
    strut.rotation.z = (i * Math.PI) / 4;
    strut.position.z = 0.27;
    root.add(strut);
  }

  const rotor = new THREE.Group();
  root.add(rotor);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.34, 24), metalMat);
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  rotor.add(hub);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.38, 18), new THREE.MeshStandardMaterial({ color: 0x74c698, roughness: 0.3, metalness: 0.6 }));
  cap.rotation.x = Math.PI / 2;
  rotor.add(cap);

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2c333b, roughness: 0.32, metalness: 0.55 });
  const bladeGeo = new THREE.BoxGeometry(0.95, 0.3, 0.035);
  for (let i = 0; i < 7; i++) {
    const bw = new THREE.Group();
    bw.rotation.z = (i / 7) * Math.PI * 2;
    const bl = new THREE.Mesh(bladeGeo, bladeMat);
    bl.position.set(0.66, 0, 0);
    bl.rotation.x = 0.48;
    bl.castShadow = true;
    bw.add(bl);
    rotor.add(bw);
  }

  const airCount = quality === 'low' ? 28 : 68;
  const airGeo = new THREE.BufferGeometry();
  const airPos = new Float32Array(airCount * 3);
  const airPh = new Float32Array(airCount);
  for (let i = 0; i < airCount; i++) {
    airPh[i] = Math.random();
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.25 + Math.random() * 0.95;
    airPos[i * 3] = Math.cos(ang) * rad;
    airPos[i * 3 + 1] = Math.sin(ang) * rad;
    airPos[i * 3 + 2] = -0.6 + airPh[i] * 3.0;
  }
  airGeo.setAttribute('position', new THREE.BufferAttribute(airPos, 3));
  const airMat = new THREE.PointsMaterial({ color: 0x74c698, size: 0.055, transparent: true, opacity: 0 });
  root.add(new THREE.Points(airGeo, airMat));

  const st = { speed: 0 };
  return {
    presets: { all: { pos: [2.6, 1.3, 3.8], target: [0, 0, 0.2] } },
    update(dt, _el, data) {
      const target = data.fan ? 18.0 : 0;
      const accel = data.fan ? 1.85 : 0.85;
      st.speed = lerp(st.speed, target, dt * accel);
      if (!data.fan && st.speed < 0.05) st.speed = 0;
      rotor.rotation.z -= st.speed * dt;

      const norm = clamp(st.speed / 18.0, 0, 1);
      airMat.opacity = norm * 0.65;
      if (norm > 0.02) {
        const pos = airGeo.attributes.position;
        for (let i = 0; i < airCount; i++) {
          airPh[i] = (airPh[i] + dt * (0.35 + norm * 1.35)) % 1;
          pos.setZ(i, -0.4 + airPh[i] * 2.8);
        }
        pos.needsUpdate = true;
      }
    },
  };
}

function buildLightingScene(scene, pal) {
  const root = new THREE.Group();
  scene.add(root);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.45, 0.2, 40), new THREE.MeshStandardMaterial({ color: pal.floor, roughness: 0.82 }));
  base.position.y = -0.1;
  base.receiveShadow = true;
  root.add(base);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.55, 24), new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.85 }));
  pot.position.y = 0.28;
  pot.castShadow = true;
  pot.receiveShadow = true;
  root.add(pot);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d52, roughness: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), leafMat);
    l.scale.set(1.6, 0.2, 0.9);
    const a = (i / 6) * Math.PI * 2;
    l.position.set(Math.cos(a) * 0.28, 0.68 + (i % 2) * 0.14, Math.sin(a) * 0.28);
    l.rotation.set(0.35, -a, 0.25);
    l.castShadow = true;
    root.add(l);
  }

  const darkMat = new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.35, metalness: 0.78 });
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 12), darkMat);
  cord.position.y = 3.2;
  root.add(cord);

  const housing = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.56, 32, 1, true), darkMat);
  housing.position.y = 2.38;
  housing.castShadow = true;
  root.add(housing);

  const innerShade = new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.53, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.25, metalness: 0.4, side: THREE.BackSide }));
  innerShade.position.y = 2.37;
  root.add(innerShade);

  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff5dc, emissive: 0xffb84d, emissiveIntensity: 0, roughness: 0.15 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), bulbMat);
  bulb.position.y = 2.18;
  root.add(bulb);

  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd27d, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.05, 2.2, 32, 1, true), beamMat);
  beam.position.y = 1.08;
  root.add(beam);

  const spot = new THREE.SpotLight(0xffcf82, 0, 10, Math.PI / 3.4, 0.55, 1.2);
  spot.position.set(0, 2.15, 0);
  spot.castShadow = true;
  root.add(spot);

  const glow = new THREE.PointLight(0xffb84d, 0, 6, 1.6);
  glow.position.set(0, 2.05, 0);
  root.add(glow);

  const st = { level: 0 };
  return {
    presets: { all: { pos: [3.4, 2.4, 4.0], target: [0, 1.25, 0] } },
    update(dt, _el, data) {
      const target = data.lamp ? 1 : 0;
      st.level = lerp(st.level, target, dt * 3.4);
      bulbMat.emissiveIntensity = st.level * 3.2;
      spot.intensity = st.level * 12;
      glow.intensity = st.level * 3.5;
      beamMat.opacity = st.level * 0.14;
    },
  };
}

function buildTemperatureScene(scene, pal, quality) {
  const root = new THREE.Group();
  scene.add(root);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.95, 0.18, 36), new THREE.MeshStandardMaterial({ color: pal.floor, roughness: 0.85 }));
  base.position.y = -0.09;
  base.receiveShadow = true;
  root.add(base);

  const metalMat = new THREE.MeshStandardMaterial({ color: pal.metal, roughness: 0.25, metalness: 0.82 });
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.0, 0.12), new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.45, metalness: 0.65 }));
  backPlate.position.set(0, 1.65, -0.18);
  backPlate.castShadow = true;
  root.add(backPlate);

  for (let i = 0; i <= 10; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(i % 5 === 0 ? 0.24 : 0.14, 0.02, 0.03), metalMat);
    tick.position.set(0.28, 0.65 + (i / 10) * 2.15, -0.1);
    root.add(tick);
  }

  const glassTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 2.55, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xeaf4f8, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false })
  );
  glassTube.position.set(0, 1.75, 0.06);
  root.add(glassTube);

  const mercMat = new THREE.MeshStandardMaterial({ color: 0xe5ab4c, emissive: 0xd97a2b, emissiveIntensity: 0.45, roughness: 0.22, metalness: 0.2 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), mercMat);
  bulb.position.set(0, 0.48, 0.06);
  bulb.castShadow = true;
  root.add(bulb);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 2.2, 20), mercMat);
  column.position.set(0, 1.58, 0.06);
  root.add(column);

  const pCount = quality === 'low' ? 28 : 64;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  const pPh = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pPh[i] = Math.random();
    const a = Math.random() * Math.PI * 2;
    const r = 0.55 + Math.random() * 0.95;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = pPh[i] * 3.1;
    pPos[i * 3 + 2] = Math.sin(a) * r;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xe5ab4c, size: 0.065, transparent: true, opacity: 0.55 });
  root.add(new THREE.Points(pGeo, pMat));

  const st = { norm: 0.4 };
  return {
    presets: { all: { pos: [2.8, 2.1, 4.2], target: [0, 1.55, 0] } },
    update(dt, elapsed, data) {
      const hasT = typeof data.temperature === 'number' && data.temperature > -90;
      const tgt = hasT ? clamp(data.temperature / 50, 0.05, 1) : 0.05;
      st.norm = lerp(st.norm, tgt, dt * 3);
      column.scale.y = st.norm;
      column.position.y = 0.52 + (2.2 * st.norm) / 2;

      const cool = new THREE.Color(0x6cb0c7);
      const warm = new THREE.Color(0xe5ab4c);
      const hot = new THREE.Color(0xe45e45);
      const col = st.norm < 0.55 ? cool.clone().lerp(warm, st.norm / 0.55) : warm.clone().lerp(hot, (st.norm - 0.55) / 0.45);
      mercMat.color.copy(col);
      mercMat.emissive.copy(col);
      mercMat.emissiveIntensity = 0.25 + st.norm * 0.7;
      pMat.color.copy(col);

      const speed = 0.22 + st.norm * 0.85;
      const pos = pGeo.attributes.position;
      for (let i = 0; i < pCount; i++) {
        pPh[i] = (pPh[i] + dt * speed) % 1;
        pos.setY(i, 0.2 + pPh[i] * 3.0);
        pos.setX(i, pos.getX(i) + Math.sin(elapsed * 2 + i) * 0.002);
      }
      pos.needsUpdate = true;
    },
  };
}

function buildSoilScene(scene, pal, quality) {
  const root = new THREE.Group();
  scene.add(root);

  const gravel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.36, 2.4), new THREE.MeshStandardMaterial({ color: 0x585c62, roughness: 0.92 }));
  gravel.position.y = 0.18;
  gravel.receiveShadow = true;
  root.add(gravel);

  const subSoilMat = new THREE.MeshStandardMaterial({ color: 0x6b4b35, roughness: 0.9 });
  const subSoil = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 2.4), subSoilMat);
  subSoil.position.y = 0.68;
  subSoil.castShadow = true;
  subSoil.receiveShadow = true;
  root.add(subSoil);

  const topSoilMat = new THREE.MeshStandardMaterial({ color: 0x8a6448, roughness: 0.94 });
  const topSoil = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.28, 2.44), topSoilMat);
  topSoil.position.y = 1.14;
  topSoil.receiveShadow = true;
  root.add(topSoil);

  const probe = new THREE.Group();
  probe.position.set(0.88, 1.38, 0.2);
  root.add(probe);
  probe.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.95, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a2822, roughness: 0.4, metalness: 0.45 })));
  const goldStrip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.07), new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.3, metalness: 0.85 }));
  goldStrip.position.y = -0.14;
  probe.add(goldStrip);

  const plant = new THREE.Group();
  plant.position.set(-0.35, 1.26, 0);
  root.add(plant);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0x3a6f45, roughness: 0.65 }));
  stem.position.y = 0.55;
  stem.castShadow = true;
  plant.add(stem);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8255, roughness: 0.52, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), leafMat);
    leaf.scale.set(1.6, 0.2, 0.9);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.3, 0.45 + (i % 3) * 0.26, Math.sin(a) * 0.3);
    leaf.rotation.set(0.32, -a, 0.25);
    leaf.castShadow = true;
    plant.add(leaf);
  }

  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.28, 14), new THREE.MeshStandardMaterial({ color: pal.darkMetal, roughness: 0.4, metalness: 0.7 }));
  emitter.position.set(-0.35, 2.55, 0.4);
  root.add(emitter);

  const dCount = quality === 'low' ? 18 : 42;
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(dCount * 3);
  const dPh = new Float32Array(dCount);
  for (let i = 0; i < dCount; i++) dPh[i] = Math.random();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dMat = new THREE.PointsMaterial({ color: 0x6cb0c7, size: 0.08, transparent: true, opacity: 0 });
  root.add(new THREE.Points(dGeo, dMat));

  const st = { moist: 0.3 };
  return {
    presets: { all: { pos: [3.6, 2.6, 4.2], target: [0, 1.15, 0] } },
    update(dt, elapsed, data) {
      const tgt = data.soilMoisture >= 0 ? clamp(data.soilMoisture / 100, 0, 1) : 0.25;
      st.moist = lerp(st.moist, tgt, dt * 2.8);
      const dryTop = new THREE.Color(0xa67e56);
      const wetTop = new THREE.Color(0x362417);
      topSoilMat.color.lerpColors(dryTop, wetTop, st.moist);
      topSoilMat.roughness = lerp(0.96, 0.38, st.moist);
      subSoilMat.color.lerpColors(new THREE.Color(0x826043), new THREE.Color(0x2d1e13), st.moist);

      dMat.opacity = lerp(dMat.opacity, data.pump ? 0.9 : 0, dt * 4);
      if (dMat.opacity > 0.02) {
        const pos = dGeo.attributes.position;
        for (let i = 0; i < dCount; i++) {
          dPh[i] = (dPh[i] + dt * 1.1) % 1;
          const a = i * 2.1;
          const r = dPh[i] * 0.32;
          pos.setXYZ(i, -0.35 + Math.cos(a) * r, 2.42 - dPh[i] * 1.15, 0.4 + Math.sin(a) * r);
        }
        pos.needsUpdate = true;
      }
      plant.rotation.z = Math.sin(elapsed * 1.6) * 0.025;
    },
  };
}

const BUILDERS = {
  greenhouse: buildGreenhouseScene,
  water: buildWaterScene,
  servo: buildServoScene,
  fan: buildFanScene,
  lighting: buildLightingScene,
  temperature: buildTemperatureScene,
  soil: buildSoilScene,
};

export const SceneManager = {
  active: null,
  stateData: { temperature: -99, humidity: -99, soilMoisture: -1, light: -1, waterLevel: -1, pump: false, fan: false, lamp: false, servo: false },

  setData(d) {
    Object.assign(this.stateData, d);
  },

  mount(container, type) {
    this.unmount();
    if (!container || !BUILDERS[type]) return;
    const quality = document.documentElement.dataset.quality || 'high';
    const pal = getThemePalette();
    const w = Math.max(container.clientWidth, 300);
    const h = Math.max(container.clientHeight, 260);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' });
    } catch {
      container.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:var(--mut);font-family:var(--font-mono);font-size:12px">WebGL tidak tersedia di perangkat ini</div>';
      return;
    }

    const dprCap = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = quality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = document.documentElement.dataset.theme === 'dark' ? 1.08 : 1.02;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(pal.fog, 0.042);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 60);
    const hemi = new THREE.HemisphereLight(pal.amb, pal.floor, document.documentElement.dataset.theme === 'dark' ? 0.65 : 1.05);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(pal.key, document.documentElement.dataset.theme === 'dark' ? 1.15 : 1.35);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = quality !== 'low';
    keyLight.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(pal.rim, 0.55);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const model = BUILDERS[type](scene, pal, quality);
    const initial = model.presets.all;
    const target = new THREE.Vector3(...initial.target);
    const desiredTarget = target.clone();
    const desiredPos = new THREE.Vector3(...initial.pos);
    camera.position.copy(desiredPos);

    let yaw = Math.atan2(desiredPos.x - target.x, desiredPos.z - target.z);
    let pitch = Math.atan2(desiredPos.y - target.y, Math.hypot(desiredPos.x - target.x, desiredPos.z - target.z));
    let radius = desiredPos.distanceTo(target);
    let targetYaw = yaw;
    let targetPitch = pitch;
    let targetRadius = radius;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let hoverX = 0, hoverY = 0;

    const onDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        hoverX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        hoverY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      targetYaw -= dx * 0.008;
      targetPitch = clamp(targetPitch + dy * 0.006, 0.08, 1.32);
    };
    const onLeave = () => { hoverX = 0; hoverY = 0; };
    const onUp = () => { dragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      targetRadius = clamp(targetRadius + e.deltaY * 0.004, 2.6, 11);
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointercancel', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      const nw = Math.max(container.clientWidth, 240);
      const nh = Math.max(container.clientHeight, 220);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const clock = new THREE.Clock();
    let rafId = 0;
    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0.05 });
    io.observe(container);

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const motionOn = document.documentElement.dataset.motion !== 'off';

      if (!dragging && motionOn) {
        targetYaw += dt * 0.085;
      }
      const pYaw = targetYaw + (motionOn && !dragging ? hoverX * 0.14 : 0);
      const pPitch = clamp(targetPitch + (motionOn && !dragging ? hoverY * 0.08 : 0), 0.08, 1.32);
      yaw = lerp(yaw, pYaw, dt * 6.5);
      pitch = lerp(pitch, pPitch, dt * 6.5);
      radius = lerp(radius, targetRadius, dt * 6.5);
      target.lerp(desiredTarget, dt * 5.5);

      camera.position.set(
        target.x + Math.cos(pitch) * Math.sin(yaw) * radius,
        target.y + Math.sin(pitch) * radius,
        target.z + Math.cos(pitch) * Math.cos(yaw) * radius
      );
      camera.lookAt(target);

      model.update(dt, elapsed, this.stateData);
      renderer.render(scene, camera);
    };
    tick();

    this.active = {
      type,
      container,
      focusPreset(name) {
        const p = model.presets[name];
        if (!p) return;
        desiredTarget.set(...p.target);
        const dp = new THREE.Vector3(...p.pos);
        targetYaw = Math.atan2(dp.x - desiredTarget.x, dp.z - desiredTarget.z);
        targetPitch = Math.atan2(dp.y - desiredTarget.y, Math.hypot(dp.x - desiredTarget.x, dp.z - desiredTarget.z));
        targetRadius = dp.distanceTo(desiredTarget);
      },
      dispose() {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        io.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onDown);
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('pointerleave', onLeave);
        renderer.domElement.removeEventListener('pointerup', onUp);
        renderer.domElement.removeEventListener('pointercancel', onUp);
        renderer.domElement.removeEventListener('wheel', onWheel);
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        renderer.dispose();
      },
    };
  },

  focus(preset) {
    if (this.active) this.active.focusPreset(preset);
  },

  refreshTheme() {
    if (!this.active) return;
    const { container, type } = this.active;
    this.mount(container, type);
  },

  unmount() {
    if (this.active) {
      this.active.dispose();
      this.active = null;
    }
  },
};
