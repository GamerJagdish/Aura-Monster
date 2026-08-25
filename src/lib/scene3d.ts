import * as THREE from 'three';

const STEP_WIDTH = 4;
const STEP_DEPTH = 2.0;
const STEP_HEIGHT = 0.5;
const STEPS_PER_REVOLUTION = 24;
const RADIUS = 9;
const MAX_STEPS = 500;
const OUTER_WALL_HEIGHT = 3.5;
const OUTER_WALL_RADIUS = RADIUS + STEP_DEPTH / 2 + 0.3;

interface AuraLevel {
  color: THREE.Color;
  particleSpeed: number;
  particleCount: number;
  glowIntensity: number;
}

const AURA_LEVELS: AuraLevel[] = [
  { color: new THREE.Color(0.3, 0.3, 0.4), particleSpeed: 0.5, particleCount: 20, glowIntensity: 0 },
  { color: new THREE.Color(0.2, 0.5, 0.8), particleSpeed: 1.0, particleCount: 40, glowIntensity: 0.3 },
  { color: new THREE.Color(0.3, 0.7, 1.0), particleSpeed: 1.5, particleCount: 60, glowIntensity: 0.5 },
  { color: new THREE.Color(0.5, 0.3, 1.0), particleSpeed: 2.0, particleCount: 80, glowIntensity: 0.7 },
  { color: new THREE.Color(1.0, 0.3, 0.5), particleSpeed: 2.5, particleCount: 100, glowIntensity: 0.9 },
  { color: new THREE.Color(1.0, 0.8, 0.2), particleSpeed: 3.5, particleCount: 150, glowIntensity: 1.0 },
  { color: new THREE.Color(1.0, 0.15, 0.15), particleSpeed: 4.5, particleCount: 180, glowIntensity: 1.5 },  // Daniel - crimson red
];

export class Scene3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stairs: THREE.Group;
  private character: THREE.Group;
  private auraParticles: THREE.Points;
  private auraGeometry: THREE.BufferGeometry;
  private auraMaterial: THREE.PointsMaterial;
  private currentStep: number = 0;
  private targetStep: number = 0;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private isFalling: boolean = false;
  private fallStartTime: number = 0; // Safety: force-end falls that take too long
  private animationId: number = 0;
  private clock: { getDelta: () => number; getElapsedTime: () => number };
  private combo: number = 0;
  private light1: THREE.PointLight;
  private light2: THREE.PointLight;
  private ambLight: THREE.AmbientLight;
  private wallLight: THREE.PointLight;
  private stepMeshes: THREE.Mesh[] = [];
  private characterAura: THREE.Mesh;
  private energyRings: THREE.Mesh[] = [];
  private skyDome: THREE.Mesh;
  private fogColor: THREE.Color;
  private shakeIntensity: number = 0;

  // Character limb references for walking animation
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private leftLegGroup: THREE.Group;
  private rightLegGroup: THREE.Group;
  private bodyGroup: THREE.Group;
  private capeMesh: THREE.Mesh;

  // Walking state
  private walkPhase: number = 0;
  private isWalking: boolean = false;
  private walkTimeout: ReturnType<typeof setTimeout> | null = null;

  // Ragdoll falling state
  private fallTumbleAngle: number = 0;
  private fallTumbleSpeed: number = 0;
  private fallBounceCount: number = 0;
  private fallVerticalVelocity: number = 0;
  private preFallPosition: THREE.Vector3 = new THREE.Vector3();

  // Smooth camera state - independent of discrete step changes
  private cameraSmoothAngle: number = 0;
  private cameraSmoothY: number = 0;
  private cameraSmoothLookX: number = 0;
  private cameraSmoothLookY: number = 0;
  private cameraSmoothLookZ: number = 0;

  // Impact frame effects
  private impactLightning: THREE.Line[] = [];
  // Shockwave rings removed - were causing visual glitches and lag
  private impactFlash: THREE.PointLight;
  private impactFlashTimer: number = 0;
  private lightningTimer: number = 0;
  private exposureFlashTimer: number = 0;
  private exposureFlashIntensity: number = 0;

  // Daniel level dual-tone (red/green alternating)
  private danielAltColor: THREE.Color = new THREE.Color(0.1, 0.9, 0.2); // Emerald green

  // Cached fog to avoid creating new FogExp2 every frame
  private cachedFog: THREE.FogExp2 = new THREE.FogExp2(new THREE.Color(0x0d0d22), 0.008);

  constructor(container: HTMLElement) {
    const startTime = performance.now();
    let lastTime = startTime;
    this.clock = {
      getDelta: () => {
        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        return Math.min(delta, 0.05);
      },
      getElapsedTime: () => (performance.now() - startTime) / 1000,
    };
    this.scene = new THREE.Scene();
    this.fogColor = new THREE.Color(0x0d0d22);
    this.scene.fog = new THREE.FogExp2(this.fogColor, 0.008);
    this.scene.background = this.fogColor;

    this.camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    container.appendChild(this.renderer.domElement);

    // Lights
    // Ambient light - subtle blue-ish night sky fill
    this.ambLight = new THREE.AmbientLight(0x3a3a5a, 2.0);
    this.scene.add(this.ambLight);

    // Moonlight - soft directional from above
    const moonLight = new THREE.DirectionalLight(0x8899bb, 1.0);
    moonLight.position.set(-20, 40, 10);
    moonLight.castShadow = true;
    this.scene.add(moonLight);

    // Character follow light (aura color)
    this.light1 = new THREE.PointLight(0x4488ff, 2, 50);
    this.light1.castShadow = true;
    this.scene.add(this.light1);

    // Secondary accent light
    this.light2 = new THREE.PointLight(0xff4488, 1, 30);
    this.scene.add(this.light2);

    // Hemisphere light - sky/ground ambient for night
    const hemiLight = new THREE.HemisphereLight(0x1a1a3a, 0x0a0a0a, 0.4);
    this.scene.add(hemiLight);

    // Wall illumination light - positioned to light up the outer wall from inside
    this.wallLight = new THREE.PointLight(0x556677, 3.0, 35);
    this.scene.add(this.wallLight);

    // Stairs
    this.stairs = new THREE.Group();
    this.scene.add(this.stairs);
    this.createStairs();

    // Character - initialize limb references
    this.leftArmGroup = new THREE.Group();
    this.rightArmGroup = new THREE.Group();
    this.leftLegGroup = new THREE.Group();
    this.rightLegGroup = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.capeMesh = new THREE.Mesh();

    this.character = new THREE.Group();
    this.scene.add(this.character);
    this.createCharacter();

    // Character aura glow
    const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    this.characterAura = new THREE.Mesh(auraGeo, auraMat);
    this.character.add(this.characterAura);

    // Aura particles
    this.auraGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(500 * 3);
    const colors = new Float32Array(500 * 3);
    const sizes = new Float32Array(500);
    this.auraGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.auraGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.auraGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.auraMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.auraParticles = new THREE.Points(this.auraGeometry, this.auraMaterial);
    this.scene.add(this.auraParticles);

    // Energy rings
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(1.5 + i * 0.5, 1.7 + i * 0.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.character.add(ring);
      this.energyRings.push(ring);
    }

    // Impact flash light - bright point light that flashes on each step
    this.impactFlash = new THREE.PointLight(0xffffff, 0, 15);
    this.scene.add(this.impactFlash);

    // Pre-create lightning bolt objects (pool of reusable bolts)
    // Each bolt uses a thick glowing cylinder + a line for the jagged shape
    for (let i = 0; i < 12; i++) {
      const boltGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(30 * 3); // 30 segments per bolt
      boltGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const boltMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const bolt = new THREE.Line(boltGeo, boltMat);
      bolt.visible = false;
      bolt.frustumCulled = false; // Prevent culling when positions are updated dynamically
      this.scene.add(bolt);
      this.impactLightning.push(bolt);
    }

    // Shockwave rings removed - were causing visual glitches and performance issues

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x0d0d22,
      side: THREE.BackSide,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Stars
    this.createStars();

    // Ground plane - stone floor
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a38,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Set initial position - character stands ON the step
    this.updateTargetPosition(0);
    this.character.position.copy(this.targetPosition);
    this.faceCharacterAlongStairs(0);

    // Camera starts - near center, looking outward at the character and wall
    const initCharAngle = Math.atan2(this.character.position.z, this.character.position.x);
    const initCamAngle = initCharAngle + Math.PI;
    const initCamRadius = RADIUS * 0.15;
    this.cameraSmoothAngle = initCamAngle;
    this.cameraSmoothY = this.character.position.y + 3;
    this.camera.position.set(
      Math.cos(initCamAngle) * initCamRadius,
      this.cameraSmoothY,
      Math.sin(initCamAngle) * initCamRadius
    );
    this.camera.lookAt(this.character.position);
    // Initialize smooth look-at target
    this.cameraSmoothLookX = this.character.position.x;
    this.cameraSmoothLookY = this.character.position.y + 1.5;
    this.cameraSmoothLookZ = this.character.position.z;

    // Handle resize
    const onResize = () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Start animation
    this.animate();
  }

  private getStepPosition(step: number): THREE.Vector3 {
    const angle = (step / STEPS_PER_REVOLUTION) * Math.PI * 2;
    const x = Math.cos(angle) * RADIUS;
    const z = Math.sin(angle) * RADIUS;
    const y = step * STEP_HEIGHT;
    return new THREE.Vector3(x, y, z);
  }

  /** Get the "up the stairs" direction at a given step */
  private getStairsAscentDirection(step: number): THREE.Vector3 {
    const posNow = this.getStepPosition(step);
    const posNext = this.getStepPosition(Math.min(step + 2, MAX_STEPS - 1));
    const dir = posNext.clone().sub(posNow).normalize();
    return dir;
  }

  /** Make the character face along the staircase ascent direction */
  private faceCharacterAlongStairs(step: number): void {
    // The spiral ascends counterclockwise. At step i, angle = (i/N) * 2π
    // The tangent direction (direction of ascent) at angle θ is (-sin(θ), 0, cos(θ))
    // Our character model faces +Z direction. We need +Z to point along the tangent.
    // At rotation.y = r, +Z direction is (sin(r), 0, cos(r))
    // We need: sin(r) = -sin(θ), cos(r) = cos(θ)  →  r = -θ
    const angle = (step / STEPS_PER_REVOLUTION) * Math.PI * 2;
    this.character.rotation.y = -angle;
    this.character.rotation.x = 0;
    this.character.rotation.z = 0;
    this.character.updateMatrix();
  }

  private createStairs(): void {
    const stepGeo = new THREE.BoxGeometry(STEP_WIDTH, STEP_HEIGHT, STEP_DEPTH);

    for (let i = 0; i < MAX_STEPS; i++) {
      const pos = this.getStepPosition(i);

      // Main step - stone material
      const stepMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.6, 0.08, 0.18 + (i / MAX_STEPS) * 0.06),
        roughness: 0.92,
        metalness: 0.05,
      });
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.copy(pos);
      step.position.y -= STEP_HEIGHT / 2;
      step.lookAt(0, pos.y - STEP_HEIGHT / 2, 0);
      step.castShadow = true;
      step.receiveShadow = true;
      this.stairs.add(step);
      this.stepMeshes.push(step);

      // Step edge subtle line (stone step edge, not glowing)
      if (i % 5 === 0) {
        const edgeGeo = new THREE.BoxGeometry(STEP_WIDTH + 0.1, 0.04, STEP_DEPTH + 0.1);
        const edgeMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.6, 0.08, 0.22),
          roughness: 0.9,
          metalness: 0.05,
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.copy(pos);
        edge.position.y += 0.02;
        edge.lookAt(0, pos.y + 0.02, 0);
        this.stairs.add(edge);
      }
    }

    // Outer wall - a continuous cylindrical stone shell (visible from inside)
    // Tomb/tower interior feel - smooth stone, no seams or visible connecting lines
    const totalHeight = MAX_STEPS * STEP_HEIGHT + OUTER_WALL_HEIGHT;
    const wallCylGeo = new THREE.CylinderGeometry(
      OUTER_WALL_RADIUS,   // top radius
      OUTER_WALL_RADIUS,   // bottom radius
      totalHeight,
      128,                 // More radial segments for perfectly smooth wall
      1,
      true                 // open-ended (no top/bottom caps)
    );
    // Stone wall - lighter color so it's visible as stone in the dark tower
    const wallCylMat = new THREE.MeshStandardMaterial({
      color: 0x666680,     // Medium stone gray - visible against dark background
      roughness: 0.92,
      metalness: 0.05,
      side: THREE.BackSide, // Only render inside face (what camera sees from center)
    });
    const wallCyl = new THREE.Mesh(wallCylGeo, wallCylMat);
    wallCyl.position.y = totalHeight / 2 - STEP_HEIGHT;
    wallCyl.receiveShadow = true;
    this.stairs.add(wallCyl);

    // Subtle stone brick horizontal lines on the wall for texture
    // These are very faint, not glowing - just stone mortar lines
    const brickLineSpacing = 3; // Every 3 steps
    for (let b = 0; b < Math.ceil(MAX_STEPS / brickLineSpacing); b++) {
      const lineY = b * brickLineSpacing * STEP_HEIGHT + OUTER_WALL_HEIGHT - STEP_HEIGHT;
      const lineGeo = new THREE.TorusGeometry(OUTER_WALL_RADIUS - 0.05, 0.03, 4, 128);
      const lineMat = new THREE.MeshStandardMaterial({
        color: 0x555570,   // Slightly lighter than wall for mortar line
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.BackSide,
      });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.y = lineY;
      line.rotation.x = Math.PI / 2;
      this.stairs.add(line);
    }
  }

  private createCharacter(): void {
    // Body group (for vertical bob and tilt)
    this.bodyGroup = new THREE.Group();
    this.character.add(this.bodyGroup);

    // === SUBARU'S OUTFIT (inside out) ===

    // 1. Orange hoodie (inner layer, visible at collar and sleeves)
    const hoodieGeo = new THREE.BoxGeometry(0.65, 0.85, 0.45);
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: 0xff7700, // Bright orange
      roughness: 0.6,
      metalness: 0.0,
    });
    const hoodie = new THREE.Mesh(hoodieGeo, hoodieMat);
    hoodie.position.y = 1.2;
    hoodie.castShadow = true;
    this.bodyGroup.add(hoodie);

    // Orange high collar
    const collarGeo = new THREE.BoxGeometry(0.55, 0.2, 0.35);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      roughness: 0.5,
      emissive: 0xff6600,
      emissiveIntensity: 0.05,
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = 1.6;
    this.bodyGroup.add(collar);

    // 2. Beige vest (middle layer)
    const vestGeo = new THREE.BoxGeometry(0.7, 0.7, 0.5);
    const vestMat = new THREE.MeshStandardMaterial({
      color: 0xc4a882, // Beige/tan
      roughness: 0.7,
      metalness: 0.0,
    });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.y = 1.3;
    vest.castShadow = true;
    this.bodyGroup.add(vest);

    // Vest buttons (small detail)
    for (let i = 0; i < 4; i++) {
      const buttonGeo = new THREE.SphereGeometry(0.025, 6, 6);
      const buttonMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.5 });
      const button = new THREE.Mesh(buttonGeo, buttonMat);
      button.position.set(0, 1.05 + i * 0.15, 0.26);
      this.bodyGroup.add(button);
    }

    // 3. Green jacket (outer layer - visible on sides and back)
    // Left side of jacket
    const jacketSideGeo = new THREE.BoxGeometry(0.18, 0.8, 0.48);
    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x2d8a4e, // Forest green
      roughness: 0.6,
      metalness: 0.0,
    });
    const jacketLeft = new THREE.Mesh(jacketSideGeo, jacketMat);
    jacketLeft.position.set(-0.32, 1.2, 0);
    jacketLeft.castShadow = true;
    this.bodyGroup.add(jacketLeft);

    const jacketRight = new THREE.Mesh(jacketSideGeo, jacketMat);
    jacketRight.position.set(0.32, 1.2, 0);
    jacketRight.castShadow = true;
    this.bodyGroup.add(jacketRight);

    // Jacket back panel (behind the vest)
    const jacketBackGeo = new THREE.BoxGeometry(0.68, 0.82, 0.12);
    const jacketBack = new THREE.Mesh(jacketBackGeo, jacketMat);
    jacketBack.position.set(0, 1.2, -0.2);
    jacketBack.castShadow = true;
    this.bodyGroup.add(jacketBack);

    // 4. Black cape (draped from shoulders, flows behind)
    // CAPE YOKE - wraps around shoulders/neck to visually anchor the cape
    const yokeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Yoke back panel - wider band across the back of shoulders
    const yokeBackGeo = new THREE.BoxGeometry(0.95, 0.18, 0.15);
    const yokeBack = new THREE.Mesh(yokeBackGeo, yokeMat);
    yokeBack.position.set(0, 1.58, -0.18);
    yokeBack.castShadow = true;
    this.bodyGroup.add(yokeBack);

    // Yoke left shoulder wrap - goes from back over the left shoulder
    const yokeLeftGeo = new THREE.BoxGeometry(0.14, 0.14, 0.22);
    const yokeLeft = new THREE.Mesh(yokeLeftGeo, yokeMat);
    yokeLeft.position.set(-0.42, 1.55, -0.06);
    yokeLeft.castShadow = true;
    this.bodyGroup.add(yokeLeft);

    // Yoke right shoulder wrap
    const yokeRightGeo = new THREE.BoxGeometry(0.14, 0.14, 0.22);
    const yokeRight = new THREE.Mesh(yokeRightGeo, yokeMat);
    yokeRight.position.set(0.42, 1.55, -0.06);
    yokeRight.castShadow = true;
    this.bodyGroup.add(yokeRight);

    // Yoke collar - connects the yoke at the neck
    const yokeCollarGeo = new THREE.BoxGeometry(0.50, 0.12, 0.15);
    const yokeCollar = new THREE.Mesh(yokeCollarGeo, yokeMat);
    yokeCollar.position.set(0, 1.62, -0.10);
    this.bodyGroup.add(yokeCollar);

    // CAPE BODY - wider at top (matching yoke), tapers down, hangs from yoke
    // Using BufferGeometry for custom shape with slight curve
    const capeShape = new THREE.Shape();
    // Top edge - wide, matching yoke width (spans full shoulder width)
    capeShape.moveTo(-0.50, 0.0);    // Left edge at yoke level
    capeShape.lineTo(0.50, 0.0);     // Right edge at yoke level
    // Taper down gracefully
    capeShape.lineTo(0.42, -0.25);   // Right side begins taper
    capeShape.lineTo(0.30, -0.55);   // Continues tapering
    capeShape.lineTo(0.18, -0.85);   // Narrower
    capeShape.lineTo(0.10, -1.1);    // Bottom right
    capeShape.lineTo(-0.10, -1.1);   // Bottom left
    capeShape.lineTo(-0.18, -0.85);  // Left side widens back up
    capeShape.lineTo(-0.30, -0.55);  // Left side
    capeShape.lineTo(-0.42, -0.25);  // Left side near top
    capeShape.lineTo(-0.50, 0.0);    // Back to left edge at yoke

    const capeGeo = new THREE.ShapeGeometry(capeShape, 6);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, // Very dark, almost black
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.capeMesh = new THREE.Mesh(capeGeo, capeMat);
    // Position so top edge (y=0.0 in local coords) is right below the yoke (~1.48 world)
    this.capeMesh.position.set(0, 1.48, -0.20);
    this.capeMesh.castShadow = true;
    this.bodyGroup.add(this.capeMesh);

    // Cape clasp at neck/shoulders - secures cape visually
    const claspGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const claspMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.4, metalness: 0.6 });
    const claspLeft = new THREE.Mesh(claspGeo, claspMat);
    claspLeft.position.set(-0.40, 1.56, -0.02);
    this.bodyGroup.add(claspLeft);
    const claspRight = new THREE.Mesh(claspGeo, claspMat);
    claspRight.position.set(0.40, 1.56, -0.02);
    this.bodyGroup.add(claspRight);

    // Head - PALE skin (Subaru is white/pale Japanese)
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfff0e6, // Very pale skin
      roughness: 0.8,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.9;
    head.castShadow = true;
    this.bodyGroup.add(head);

    // Hair (dark gray/black, messy - Subaru style)
    const hairGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a, // Dark gray-black
      roughness: 0.9,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.98;
    hair.scale.set(1.1, 0.9, 1.1);
    this.bodyGroup.add(hair);

    // Hair spikes
    for (let i = 0; i < 6; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.07, 0.3, 4);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 0.9,
      });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      const angle = (i / 6) * Math.PI * 1.2 - Math.PI * 0.6;
      spike.position.set(
        Math.sin(angle) * 0.22,
        2.15,
        Math.cos(angle) * 0.12 - 0.05
      );
      spike.rotation.z = Math.sin(angle) * 0.4;
      this.bodyGroup.add(spike);
    }

    // Eyes - AMBER/Brown (Subaru's actual eye color)
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd4a030 }); // Amber
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 1.88, 0.22);
    this.bodyGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 1.88, 0.22);
    this.bodyGroup.add(rightEye);

    // Hands (visible skin at end of arms)
    const handGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const handMat = new THREE.MeshStandardMaterial({
      color: 0xfff0e6, // Same pale skin
      roughness: 0.8,
    });

    // Left arm - pivot at shoulder, wearing green jacket sleeve
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.4, 1.5, 0);
    const leftArmGeo = new THREE.BoxGeometry(0.17, 0.6, 0.17);
    const leftArmMat = new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.6 }); // Green sleeve
    const leftArm = new THREE.Mesh(leftArmGeo, leftArmMat);
    leftArm.position.y = -0.3;
    leftArm.castShadow = true;
    this.leftArmGroup.add(leftArm);
    // Orange hoodie sleeve peek
    const leftSleeveGeo = new THREE.BoxGeometry(0.14, 0.15, 0.14);
    const leftSleeveMat = new THREE.MeshStandardMaterial({ color: 0xff7700, roughness: 0.6 });
    const leftSleeve = new THREE.Mesh(leftSleeveGeo, leftSleeveMat);
    leftSleeve.position.y = -0.55;
    this.leftArmGroup.add(leftSleeve);
    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.y = -0.65;
    this.leftArmGroup.add(leftHand);
    this.bodyGroup.add(this.leftArmGroup);

    // Right arm
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.4, 1.5, 0);
    const rightArm = new THREE.Mesh(leftArmGeo.clone(), leftArmMat.clone());
    rightArm.position.y = -0.3;
    rightArm.castShadow = true;
    this.rightArmGroup.add(rightArm);
    const rightSleeve = new THREE.Mesh(leftSleeveGeo.clone(), leftSleeveMat.clone());
    rightSleeve.position.y = -0.55;
    this.rightArmGroup.add(rightSleeve);
    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.y = -0.65;
    this.rightArmGroup.add(rightHand);
    this.bodyGroup.add(this.rightArmGroup);

    // Left leg - pivot at hip
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.14, 0.78, 0);
    const leftLegGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
    const leftLegMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 }); // Dark gray pants
    const leftLeg = new THREE.Mesh(leftLegGeo, leftLegMat);
    leftLeg.position.y = -0.3;
    leftLeg.castShadow = true;
    this.leftLegGroup.add(leftLeg);
    // Tan boot
    const bootGeo = new THREE.BoxGeometry(0.22, 0.14, 0.3);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.7 }); // Tan leather
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.6, 0.04);
    this.leftLegGroup.add(leftBoot);
    this.bodyGroup.add(this.leftLegGroup);

    // Right leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.14, 0.78, 0);
    const rightLeg = new THREE.Mesh(leftLegGeo.clone(), leftLegMat.clone());
    rightLeg.position.y = -0.3;
    rightLeg.castShadow = true;
    this.rightLegGroup.add(rightLeg);
    const rightBoot = new THREE.Mesh(bootGeo.clone(), bootMat.clone());
    rightBoot.position.set(0, -0.6, 0.04);
    this.rightLegGroup.add(rightBoot);
    this.bodyGroup.add(this.rightLegGroup);

    // Belt
    const beltGeo = new THREE.BoxGeometry(0.66, 0.06, 0.46);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.5, metalness: 0.2 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.82;
    this.bodyGroup.add(belt);
  }

  private createStars(): void {
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2000;
    const positions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 300 + Math.random() * 50;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(stars);
  }

  private updateTargetPosition(step: number): void {
    const pos = this.getStepPosition(step);
    this.targetPosition.copy(pos);
    this.targetPosition.y = pos.y;
    this.targetLookAt.copy(pos);
    this.targetLookAt.y += 1.5;
  }

  private updateAuraParticles(): void {
    const positions = this.auraGeometry.attributes.position;
    const colors = this.auraGeometry.attributes.color;
    const time = this.clock.getElapsedTime();
    const auraLevel = this.getAuraLevel();
    const auraIndex = AURA_LEVELS.indexOf(auraLevel);
    const isDaniel = auraIndex === 6;
    const charPos = this.character.position;

    for (let i = 0; i < 500; i++) {
      if (i < auraLevel.particleCount) {
        const t = time * auraLevel.particleSpeed + i * 0.5;
        const radius = 0.5 + Math.sin(t * 2 + i) * 0.8;
        const height = (Math.sin(t + i * 0.3) + 1) * 1.5;
        const angle = t + (i / auraLevel.particleCount) * Math.PI * 2;

        const x = charPos.x + Math.cos(angle) * radius;
        const y = charPos.y + height;
        const z = charPos.z + Math.sin(angle) * radius;

        (positions as THREE.BufferAttribute).setXYZ(i, x, y, z);

        // Daniel: alternate particle colors between red and green
        if (isDaniel) {
          const useGreen = i % 3 === 0;
          const c = useGreen ? this.danielAltColor : auraLevel.color;
          const intensity = 0.7 + Math.sin(t * 3 + i) * 0.3;
          (colors as THREE.BufferAttribute).setXYZ(i, c.r * intensity, c.g * intensity, c.b * intensity);
        } else {
          const c = auraLevel.color;
          const intensity = 0.7 + Math.sin(t * 3 + i) * 0.3;
          (colors as THREE.BufferAttribute).setXYZ(i, c.r * intensity, c.g * intensity, c.b * intensity);
        }
      } else {
        (positions as THREE.BufferAttribute).setXYZ(i, 0, -1000, 0);
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;

    this.auraMaterial.opacity = 0.5 + auraLevel.glowIntensity * 0.4;
    this.auraMaterial.size = 0.15;
  }

  /** Generate a jagged lightning bolt path between two points */
  private generateLightningPath(start: THREE.Vector3, end: THREE.Vector3, segments: number, jitter: number): Float32Array {
    const points = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const x = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * jitter * (1 - Math.abs(t - 0.5) * 2);
      const y = start.y + (end.y - start.y) * t + (Math.random() - 0.5) * jitter * (1 - Math.abs(t - 0.5) * 2);
      const z = start.z + (end.z - start.z) * t + (Math.random() - 0.5) * jitter * (1 - Math.abs(t - 0.5) * 2);
      points[i * 3] = x;
      points[i * 3 + 1] = y;
      points[i * 3 + 2] = z;
    }
    return points;
  }

  /** Trigger impact frame effects on a step - intensity scales with aura level */
  private triggerImpactFrame(): void {
    const auraLevel = this.getAuraLevel();
    const auraIndex = AURA_LEVELS.indexOf(auraLevel);
    const charPos = this.character.position;

    // Daniel dual-tone: alternate between crimson and emerald
    const isDaniel = auraIndex === 6;
    const danielColor = isDaniel
      ? (Math.random() < 0.5 ? auraLevel.color.clone() : this.danielAltColor.clone())
      : auraLevel.color.clone();

    // --- IMPACT FLASH ---
    const flashIntensity = [0.5, 4, 8, 18, 30, 50, 70][auraIndex];
    this.impactFlash.intensity = flashIntensity;
    this.impactFlash.position.copy(charPos);
    this.impactFlash.position.y += 1.0;
    this.impactFlash.color.copy(isDaniel ? danielColor : auraLevel.color);
    this.impactFlash.distance = 20 + auraIndex * 4;
    this.impactFlashTimer = [0.05, 0.1, 0.14, 0.18, 0.24, 0.3, 0.4][auraIndex];

    // --- LIGHTNING BOLTS ---
    // Force-reset ALL bolts to a clean state first to prevent stale/inconsistent state
    this.impactLightning.forEach(bolt => {
      bolt.visible = false;
      (bolt.material as THREE.LineBasicMaterial).opacity = 0;
    });

    const boltCount = [1, 2, 3, 5, 8, 10, 12][auraIndex];
    const boltJitter = [0.2, 0.5, 0.8, 1.2, 1.8, 2.5, 3.5][auraIndex];
    const boltLength = [1.0, 2.5, 4.0, 5.5, 7.5, 10.0, 14.0][auraIndex];
    const boltOpacity = [0.5, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0][auraIndex];

    for (let i = 0; i < this.impactLightning.length; i++) {
      const bolt = this.impactLightning[i];
      if (i < boltCount) {
        // Generate a random direction for this bolt
        const angle = Math.random() * Math.PI * 2;
        const upAngle = Math.random() * 0.8 + 0.3; // Angle upward
        const start = charPos.clone();
        start.y += 1.0; // Start from character center
        const end = new THREE.Vector3(
          charPos.x + Math.cos(angle) * Math.cos(upAngle) * boltLength,
          charPos.y + 1.0 + Math.sin(upAngle) * boltLength,
          charPos.z + Math.sin(angle) * Math.cos(upAngle) * boltLength
        );

        const posAttr = bolt.geometry.attributes.position as THREE.BufferAttribute;
        const path = this.generateLightningPath(start, end, 30, boltJitter);
        for (let j = 0; j < 30 * 3; j++) {
          posAttr.array[j] = path[j];
        }
        posAttr.needsUpdate = true;

        const mat = bolt.material as THREE.LineBasicMaterial;
        // Lightning color: always bright white core with aura color tint
        if (isDaniel) {
          const baseColor = Math.random() < 0.5 ? auraLevel.color : this.danielAltColor;
          mat.color.copy(baseColor).lerp(new THREE.Color(0xffffff), 0.6); // White-hot core
        } else {
          mat.color.copy(auraLevel.color).lerp(new THREE.Color(0xffffff), auraIndex >= 3 ? 0.6 : 0.4);
        }
        mat.opacity = boltOpacity;
        bolt.visible = true;
      }
      // Bolts beyond boltCount are already hidden by the force-reset above
    }
    // Reset lightning timer fresh each step - ensure it's always set
    this.lightningTimer = [0.08, 0.12, 0.16, 0.2, 0.28, 0.35, 0.45][auraIndex];

    // Shockwave rings removed - were causing visual glitches and lag

    // --- SCREEN SHAKE per step ---
    const stepShake = [0, 0.02, 0.04, 0.08, 0.12, 0.2, 0.35][auraIndex];
    this.shakeIntensity = Math.max(this.shakeIntensity, stepShake);

    // --- EXPOSURE FLASH ---
    this.exposureFlashIntensity = [0, 0.08, 0.15, 0.3, 0.6, 1.0, 1.5][auraIndex];
    this.exposureFlashTimer = [0, 0.03, 0.04, 0.05, 0.07, 0.1, 0.14][auraIndex];
  }

  /** Update impact frame effects each frame (fade out lightning, flash) */
  private updateImpactEffects(delta: number): void {
    // Fade impact flash
    if (this.impactFlashTimer > 0) {
      this.impactFlashTimer -= delta;
      if (this.impactFlashTimer <= 0) {
        this.impactFlash.intensity = 0;
        this.impactFlashTimer = 0;
      } else {
        // Rapid fade out
        this.impactFlash.intensity *= 0.85;
      }
    }

    // Fade lightning bolts - slower fade for visibility
    if (this.lightningTimer > 0) {
      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        this.impactLightning.forEach(bolt => {
          bolt.visible = false;
          (bolt.material as THREE.LineBasicMaterial).opacity = 0;
        });
        this.lightningTimer = 0;
      } else {
        this.impactLightning.forEach(bolt => {
          if (bolt.visible) {
            const mat = bolt.material as THREE.LineBasicMaterial;
            mat.opacity *= 0.93; // Slower fade for better visibility (was 0.88)
            // Re-jitter the bolt for electric flickering - reduced frequency for performance
            if (Math.random() < 0.2) {
              const posAttr = bolt.geometry.attributes.position as THREE.BufferAttribute;
              for (let i = 1; i < 29; i++) { // Skip first and last point
                posAttr.array[i * 3] += (Math.random() - 0.5) * 0.2;
                posAttr.array[i * 3 + 1] += (Math.random() - 0.5) * 0.2;
                posAttr.array[i * 3 + 2] += (Math.random() - 0.5) * 0.2;
              }
              posAttr.needsUpdate = true;
            }
          }
        });
      }
    }

    // Shockwave rings removed

    // Fade exposure flash
    if (this.exposureFlashTimer > 0) {
      this.exposureFlashTimer -= delta;
      if (this.exposureFlashTimer <= 0) {
        this.exposureFlashIntensity = 0;
        this.exposureFlashTimer = 0;
      } else {
        this.exposureFlashIntensity *= 0.85;
      }
    }
  }

  private getAuraLevel(): AuraLevel {
    if (this.combo < 5) return AURA_LEVELS[0];
    if (this.combo < 15) return AURA_LEVELS[1];
    if (this.combo < 30) return AURA_LEVELS[2];
    if (this.combo < 50) return AURA_LEVELS[3];
    if (this.combo < 80) return AURA_LEVELS[4];
    if (this.combo < 100) return AURA_LEVELS[5];
    return AURA_LEVELS[6]; // Daniel - 100+
  }

  /** Animate the cape with wind/follow effect */
  private animateCape(delta: number, time: number): void {
    if (!this.capeMesh) return;
    const posAttr = this.capeMesh.geometry.attributes.position;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      // Lower vertices sway more (y=0.0 is top/yoke, y=-1.1 is bottom)
      const sagFactor = Math.max(0, -y * 1.2);
      const sway = Math.sin(time * 3 + y * 2) * sagFactor * 0.10;
      const wave = Math.sin(time * 2 + y * 3) * sagFactor * 0.05;
      // Only move Z (depth) for swaying, keep X stable so cape stays behind character
      posAttr.setZ(i, -0.20 + sway + wave);
    }
    posAttr.needsUpdate = true;

    // If falling, cape billows upward
    if (this.isFalling) {
      this.capeMesh.rotation.x = -0.5;
    } else if (this.isWalking) {
      this.capeMesh.rotation.x = -0.15;
    } else {
      this.capeMesh.rotation.x *= 0.95;
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // === RAGDOLL FALLING PHYSICS ===
    if (this.isFalling) {
      // Safety: force-end falls that take too long (prevents stuck isFalling state)
      if (this.fallStartTime > 0 && performance.now() - this.fallStartTime > 3000) {
        this.isFalling = false;
        this.fallBounceCount = 0;
        this.fallVerticalVelocity = 0;
        this.fallTumbleAngle = 0;
        this.fallTumbleSpeed = 0;
        this.character.position.copy(this.targetPosition);
        this.bodyGroup.rotation.x = 0;
        this.bodyGroup.rotation.z = 0;
      }

      // Apply gravity - character FALLS DOWN
      this.fallVerticalVelocity -= delta * 18; // Strong gravity pulling down
      this.character.position.y += this.fallVerticalVelocity * delta;

      // Horizontal: slide toward the target (falling down the spiral)
      this.character.position.x += (this.targetPosition.x - this.character.position.x) * delta * 3.0;
      this.character.position.z += (this.targetPosition.z - this.character.position.z) * delta * 3.0;

      // Check if reached target height (landed)
      if (this.character.position.y <= this.targetPosition.y) {
        this.character.position.y = this.targetPosition.y;

        if (this.fallBounceCount < 2 && Math.abs(this.fallVerticalVelocity) > 1.0) {
          // Bounce! Reverse velocity with energy loss
          this.fallVerticalVelocity = Math.abs(this.fallVerticalVelocity) * 0.25;
          this.fallBounceCount++;
          this.shakeIntensity = 0.15;
          // Reduce tumble on each bounce
          this.fallTumbleSpeed *= 0.5;
        } else {
          // Land firmly
          this.isFalling = false;
          this.fallBounceCount = 0;
          this.fallVerticalVelocity = 0;
          this.fallTumbleAngle = 0;
          this.fallTumbleSpeed = 0;

          // Reset body tilt smoothly
          this.bodyGroup.rotation.x = 0;
          this.bodyGroup.rotation.z = 0;
        }
      }

      // Tumble rotation - character tumbles forward as they fall down stairs
      this.fallTumbleAngle += this.fallTumbleSpeed * delta;
      this.bodyGroup.rotation.x = -0.4 + Math.sin(this.fallTumbleAngle) * 0.4; // Leaning forward + tumble
      this.bodyGroup.rotation.z = Math.cos(this.fallTumbleAngle * 0.7) * 0.25; // Slight side tilt

      // Flailing limbs - desperate grabbing at air
      this.walkPhase += delta * 14;
      this.leftArmGroup.rotation.x = Math.sin(this.walkPhase * 2.0) * 1.2;
      this.rightArmGroup.rotation.x = Math.sin(this.walkPhase * 2.0 + 1.5) * 1.2;
      this.leftArmGroup.rotation.z = 0.4 + Math.sin(this.walkPhase * 1.5) * 0.4; // Arms reaching out
      this.rightArmGroup.rotation.z = -0.4 - Math.sin(this.walkPhase * 1.5 + 0.5) * 0.4;
      this.leftLegGroup.rotation.x = Math.sin(this.walkPhase * 1.8) * 0.8;
      this.rightLegGroup.rotation.x = Math.sin(this.walkPhase * 1.8 + 1.2) * 0.8;

      // Face character along stairs even while falling
      this.faceCharacterAlongStairs(this.currentStep);

    } else {
      // Normal movement - smooth lerp to target
      const lerpSpeed = 3.0;
      this.character.position.lerp(this.targetPosition, delta * lerpSpeed);

      // Face the stairs (upward along the ascent)
      this.faceCharacterAlongStairs(this.currentStep);

      // Walking animation
      if (this.isWalking) {
        this.walkPhase += delta * 12;
        const swing = Math.sin(this.walkPhase) * 0.6;

        // Leg swing - alternate
        this.leftLegGroup.rotation.x = swing;
        this.rightLegGroup.rotation.x = -swing;
        this.leftLegGroup.rotation.z = 0;
        this.rightLegGroup.rotation.z = 0;

        // Arm swing - opposite to legs
        this.leftArmGroup.rotation.x = -swing * 0.7;
        this.rightArmGroup.rotation.x = swing * 0.7;
        this.leftArmGroup.rotation.z = 0;
        this.rightArmGroup.rotation.z = 0;

        // Slight body bob and lean forward
        const bob = Math.abs(Math.sin(this.walkPhase * 2)) * 0.04;
        this.bodyGroup.position.y = bob;
        this.bodyGroup.rotation.x = 0.08; // Slight forward lean while climbing
        this.bodyGroup.rotation.z = 0;
      } else {
        // Idle - gradually return to rest pose
        this.leftLegGroup.rotation.x *= 0.9;
        this.rightLegGroup.rotation.x *= 0.9;
        this.leftArmGroup.rotation.x *= 0.9;
        this.rightArmGroup.rotation.x *= 0.9;
        this.leftLegGroup.rotation.z *= 0.9;
        this.rightLegGroup.rotation.z *= 0.9;
        this.leftArmGroup.rotation.z *= 0.9;
        this.rightArmGroup.rotation.z *= 0.9;
        this.bodyGroup.position.y *= 0.9;
        this.bodyGroup.rotation.x *= 0.9;
        this.bodyGroup.rotation.z *= 0.9;

        // Subtle idle breathing
        const breathe = Math.sin(time * 2) * 0.015;
        this.bodyGroup.position.y = breathe;
      }
    }

    // Cape animation
    this.animateCape(delta, time);

    // Camera follow - SMOOTH cinematic movement with ADAPTIVE speed
    // The camera has its OWN internal angle/Y that slowly interpolates
    // toward where the character is. Speed increases when character is
    // getting far from camera view to NEVER lose sight of the character.
    const charActualPos = this.character.position;
    const targetCharAngle = Math.atan2(charActualPos.z, charActualPos.x);
    const targetCameraAngle = targetCharAngle + Math.PI;
    const targetCameraY = charActualPos.y + 3;

    // Smoothly interpolate camera angle (handle angle wrapping)
    let angleDiff = targetCameraAngle - this.cameraSmoothAngle;
    // Normalize angle difference to [-PI, PI] for shortest path
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // ADAPTIVE SPEED: Base speed is gentle, but ramps up quadratically
    // as the camera falls behind. This keeps movement fluid when slow
    // but guarantees the camera catches up fast when needed.
    const absAngleDiff = Math.abs(angleDiff);
    const baseAngleSpeed = 1.5;
    const angleSpeedBoost = absAngleDiff * absAngleDiff * 15.0; // Quadratic ramp
    const angleLerpSpeed = baseAngleSpeed + angleSpeedBoost;
    this.cameraSmoothAngle += angleDiff * Math.min(delta * angleLerpSpeed, 1.0);

    // ADAPTIVE Y speed: Same approach - gentle when close, fast when far
    const yDiff = targetCameraY - this.cameraSmoothY;
    const absYDiff = Math.abs(yDiff);
    const baseYSpeed = 2.0;
    const ySpeedBoost = absYDiff * absYDiff * 8.0;
    const yLerpSpeed = baseYSpeed + ySpeedBoost;
    this.cameraSmoothY += yDiff * Math.min(delta * yLerpSpeed, 1.0);

    // Set camera position from smooth values
    const cameraOrbitRadius = RADIUS * 0.15;
    this.camera.position.set(
      Math.cos(this.cameraSmoothAngle) * cameraOrbitRadius,
      this.cameraSmoothY,
      Math.sin(this.cameraSmoothAngle) * cameraOrbitRadius
    );

    // Smoothly interpolate look-at target with adaptive speed
    const lookBeyondDir = new THREE.Vector3(charActualPos.x, 0, charActualPos.z).normalize();
    const targetLookX = charActualPos.x + lookBeyondDir.x * 2;
    const targetLookY = charActualPos.y + 1.5;
    const targetLookZ = charActualPos.z + lookBeyondDir.z * 2;

    const lookXDiff = targetLookX - this.cameraSmoothLookX;
    const lookYDiff = targetLookY - this.cameraSmoothLookY;
    const lookZDiff = targetLookZ - this.cameraSmoothLookZ;
    const lookDist = Math.sqrt(lookXDiff * lookXDiff + lookYDiff * lookYDiff + lookZDiff * lookZDiff);
    const baseLookSpeed = 2.0;
    const lookSpeedBoost = lookDist * lookDist * 6.0;
    const lookLerpSpeed = baseLookSpeed + lookSpeedBoost;
    const lookFactor = Math.min(delta * lookLerpSpeed, 1.0);

    this.cameraSmoothLookX += lookXDiff * lookFactor;
    this.cameraSmoothLookY += lookYDiff * lookFactor;
    this.cameraSmoothLookZ += lookZDiff * lookFactor;

    this.camera.lookAt(this.cameraSmoothLookX, this.cameraSmoothLookY, this.cameraSmoothLookZ);

    // Camera shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.92;
      if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
    }

    // Update lights to follow character
    this.light1.position.set(
      this.character.position.x,
      this.character.position.y + 3,
      this.character.position.z
    );
    this.light2.position.set(
      this.character.position.x + 2,
      this.character.position.y + 1,
      this.character.position.z + 2
    );

    // Wall light - positioned near the wall surface to illuminate stone texture
    const wallDir = new THREE.Vector3(this.targetPosition.x, 0, this.targetPosition.z).normalize();
    this.wallLight.position.set(
      wallDir.x * (RADIUS + 2),
      this.targetPosition.y + 1,
      wallDir.z * (RADIUS + 2)
    );

    // Update aura effects
    const auraLevel = this.getAuraLevel();
    const auraIndex = AURA_LEVELS.indexOf(auraLevel);
    const isDaniel = auraIndex === 6;

    // Daniel: alternate light colors between red and green rapidly
    if (isDaniel) {
      const danielT = Math.sin(time * 8);
      this.light1.color.copy(danielT > 0 ? auraLevel.color : this.danielAltColor);
      this.light2.color.copy(danielT <= 0 ? auraLevel.color : this.danielAltColor);
      this.light1.intensity = 4 + this.combo * 0.08;
      this.light2.intensity = 3 + this.combo * 0.06;
    } else {
      this.light1.color.copy(auraLevel.color);
      this.light1.intensity = 2 + this.combo * 0.05;
      this.light2.color.copy(auraLevel.color);
      this.light2.intensity = 1 + this.combo * 0.03;
    }

    // Character aura glow
    const auraMat = this.characterAura.material as THREE.MeshBasicMaterial;
    if (isDaniel) {
      // Daniel: pulsing dual-tone aura
      const danielPulse = Math.sin(time * 6) * 0.5 + 0.5;
      auraMat.color.copy(danielPulse > 0.5 ? auraLevel.color : this.danielAltColor);
      auraMat.opacity = 0.5 + Math.sin(time * 4) * 0.2;
    } else {
      auraMat.color.copy(auraLevel.color);
      auraMat.opacity = auraLevel.glowIntensity * 0.3;
    }
    this.characterAura.scale.setScalar(1 + auraLevel.glowIntensity * 0.5 + Math.sin(time * 3) * 0.1);

    // Energy rings
    this.energyRings.forEach((ring, i) => {
      const mat = ring.material as THREE.MeshBasicMaterial;
      if (isDaniel) {
        // Daniel: each ring alternates between red and green
        mat.color.copy(i % 2 === 0 ? auraLevel.color : this.danielAltColor);
        mat.opacity = 0.5 + Math.sin(time * 4 + i) * 0.2;
      } else {
        mat.color.copy(auraLevel.color);
        mat.opacity = auraLevel.glowIntensity * 0.3 * (1 - i * 0.25);
      }
      ring.rotation.z = time * (1 + i * 0.5);
      ring.rotation.x = Math.PI / 2 + Math.sin(time * 2 + i) * 0.2;
      const ringScale = 1 + Math.sin(time * 2 + i * Math.PI * 0.66) * 0.2;
      ring.scale.set(ringScale, ringScale, 1);
      ring.position.y = 1.0 + Math.sin(time + i * 0.5) * 0.3;
    });

    // Update aura particles
    this.updateAuraParticles();

    // Update impact frame effects (lightning fade, flash decay)
    this.updateImpactEffects(delta);

    // Fog changes with height - reuse cached fog object instead of creating new one each frame
    const heightFactor = Math.min(this.currentStep / MAX_STEPS, 1);
    (this.cachedFog.color as THREE.Color).lerpColors(new THREE.Color(0x0d0d22), auraLevel.color, heightFactor * 0.2);
    this.cachedFog.density = 0.008 - heightFactor * 0.003;
    this.scene.fog = this.cachedFog;

    // Renderer exposure based on combo + impact flash
    this.renderer.toneMappingExposure = 1.0 + auraLevel.glowIntensity * 0.5 + this.exposureFlashIntensity;

    this.renderer.render(this.scene, this.camera);
  }

  public climbStep(): void {
    // Always increment combo even during falling - the React combo keeps
    // incrementing during falls, so Scene3D must stay in sync.
    // If we skip this, the combo desyncs and aura levels never recover.
    this.combo++;

    if (this.isFalling) return; // Skip visual updates while falling, but combo is already updated
    this.currentStep = Math.min(this.currentStep + 1, MAX_STEPS - 1);
    this.updateTargetPosition(this.currentStep);

    // Start walking animation
    this.isWalking = true;
    if (this.walkTimeout) clearTimeout(this.walkTimeout);
    this.walkTimeout = setTimeout(() => {
      this.isWalking = false;
    }, 400);

    // Highlight the current step - glow intensity scales with aura level
    const auraLevel = this.getAuraLevel();
    const auraIndex = AURA_LEVELS.indexOf(auraLevel);
    if (this.currentStep < this.stepMeshes.length) {
      const step = this.stepMeshes[this.currentStep];
      const mat = step.material as THREE.MeshStandardMaterial;
      // Daniel: alternate step glow colors
      if (auraIndex === 6) {
        mat.emissive.copy(this.currentStep % 2 === 0 ? auraLevel.color : this.danielAltColor);
      } else {
        mat.emissive.copy(auraLevel.color);
      }
      const glowIntensity = [0.2, 0.5, 0.8, 1.2, 2.0, 3.5, 5.0][auraIndex];
      mat.emissiveIntensity = glowIntensity;
      setTimeout(() => {
        mat.emissiveIntensity = 0;
      }, 300);
    }

    // Trigger impact frame effects (lightning, flash)
    this.triggerImpactFrame();
  }

  public fallDown(steps: number = 5): void {
    this.isFalling = true;
    this.isWalking = false;
    this.combo = 0;
    this.fallStartTime = performance.now();

    // Immediately clear all lightning and impact effects on fall
    this.lightningTimer = 0;
    this.impactFlashTimer = 0;
    this.impactFlash.intensity = 0;
    this.exposureFlashIntensity = 0;
    this.exposureFlashTimer = 0;
    this.impactLightning.forEach(bolt => {
      bolt.visible = false;
      (bolt.material as THREE.LineBasicMaterial).opacity = 0;
    });

    // Save pre-fall position
    this.preFallPosition.copy(this.character.position);

    // Set target step (landing position)
    this.currentStep = Math.max(0, this.currentStep - steps);
    this.updateTargetPosition(this.currentStep);

    // Initialize ragdoll physics - start with zero velocity, gravity pulls down immediately
    this.fallVerticalVelocity = 0; // No upward launch - just falls!
    this.fallBounceCount = 0;
    this.fallTumbleAngle = 0;
    this.fallTumbleSpeed = 6 + Math.random() * 3; // Tumble rotation speed
    this.shakeIntensity = 0.4;

    // Flash red
    const auraMat = this.characterAura.material as THREE.MeshBasicMaterial;
    auraMat.color.set(0xff0000);
    auraMat.opacity = 0.6;
    setTimeout(() => {
      auraMat.opacity = 0;
    }, 400);
  }

  /** Return by Death - fall all the way to the bottom (step 0) */
  public fallToBottom(): void {
    this.isFalling = true;
    this.isWalking = false;
    this.combo = 0;
    this.fallStartTime = performance.now();

    // Immediately clear all lightning and impact effects on fall
    this.lightningTimer = 0;
    this.impactFlashTimer = 0;
    this.impactFlash.intensity = 0;
    this.exposureFlashIntensity = 0;
    this.exposureFlashTimer = 0;
    this.impactLightning.forEach(bolt => {
      bolt.visible = false;
      (bolt.material as THREE.LineBasicMaterial).opacity = 0;
    });

    // Save pre-fall position
    this.preFallPosition.copy(this.character.position);

    // Set target to the very bottom
    this.currentStep = 0;
    this.updateTargetPosition(0);

    // Initialize ragdoll physics with more dramatic fall
    this.fallVerticalVelocity = 0;
    this.fallBounceCount = 0;
    this.fallTumbleAngle = 0;
    this.fallTumbleSpeed = 10 + Math.random() * 4; // Faster tumble for dramatic fall
    this.shakeIntensity = 0.8; // Stronger shake

    // Flash red more intensely
    const auraMat = this.characterAura.material as THREE.MeshBasicMaterial;
    auraMat.color.set(0xff0000);
    auraMat.opacity = 0.8;
    setTimeout(() => {
      auraMat.opacity = 0;
    }, 600);
  }

  public setCombo(combo: number): void {
    this.combo = combo;
  }

  /** Reset character position to the bottom step (for new test) */
  public resetPosition(): void {
    this.isFalling = false;
    this.isWalking = false;
    this.combo = 0;
    this.currentStep = 0;
    this.targetStep = 0;

    // Teleport character to step 0 immediately
    this.updateTargetPosition(0);
    this.character.position.copy(this.targetPosition);
    this.faceCharacterAlongStairs(0);

    // Reset body tilt from previous fall/walk
    this.bodyGroup.rotation.x = 0;
    this.bodyGroup.rotation.z = 0;
    this.bodyGroup.position.y = 0;

    // Reset all limbs
    this.leftArmGroup.rotation.x = 0;
    this.rightArmGroup.rotation.x = 0;
    this.leftArmGroup.rotation.z = 0;
    this.rightArmGroup.rotation.z = 0;
    this.leftLegGroup.rotation.x = 0;
    this.rightLegGroup.rotation.x = 0;

    // Reset cape rotation
    this.capeMesh.rotation.x = 0;

    // Clear all impact effects
    this.impactFlash.intensity = 0;
    this.impactFlashTimer = 0;
    this.lightningTimer = 0;
    this.exposureFlashIntensity = 0;
    this.exposureFlashTimer = 0;
    this.impactLightning.forEach(bolt => {
      bolt.visible = false;
      (bolt.material as THREE.LineBasicMaterial).opacity = 0;
    });

    // Snap camera to the new position immediately
    const charAngle = Math.atan2(this.character.position.z, this.character.position.x);
    const camAngle = charAngle + Math.PI;
    const camRadius = RADIUS * 0.15;
    this.cameraSmoothAngle = camAngle;
    this.cameraSmoothY = this.character.position.y + 3;
    this.cameraSmoothLookX = this.character.position.x;
    this.cameraSmoothLookY = this.character.position.y + 1.5;
    this.cameraSmoothLookZ = this.character.position.z;
    this.camera.position.set(
      Math.cos(camAngle) * camRadius,
      this.cameraSmoothY,
      Math.sin(camAngle) * camRadius
    );
    this.camera.lookAt(this.character.position);
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getCombo(): number {
    return this.combo;
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    if (this.walkTimeout) clearTimeout(this.walkTimeout);
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });
    this.renderer.domElement.remove();
  }
}
