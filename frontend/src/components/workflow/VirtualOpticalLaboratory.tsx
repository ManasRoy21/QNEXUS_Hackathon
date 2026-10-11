'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Layers,
  Sparkles,
  Activity,
  Check,
  ChevronRight,
  Sliders,
  Eye,
  EyeOff,
  Navigation
} from 'lucide-react';

interface Props {
  distanceKm: number;
  fiberAttenuation: number;
  pulseCount: number;
  simulationState?: any;
  onGenerate?: () => void;
  loading?: boolean;
}

type SchemeType = 'scheme1' | 'scheme2';

interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  role: string;
  description: string;
  specs: string;
  station: 'Alice' | 'Bob' | 'Charlie' | 'Channel';
}

const COMPONENT_DETAILS: Record<string, ComponentInfo> = {
  laser: {
    id: 'laser',
    name: 'Laser Source',
    type: 'Weak Coherent Source',
    role: 'Quantum state emission',
    description:
      'Phase-randomized pulsed laser diode operating at 1550 nm telecommunications window. Emits weak coherent states |α⟩ with Poissonian photon number distribution, establishing the physical foundation for decoy-state QDS protocol.',
    specs: 'λ = 1550 nm · Rep Rate: 100 MHz · FWHM: 50 ps',
    station: 'Alice',
  },
  am: {
    id: 'am',
    name: 'Amplitude Modulator (AM)',
    type: 'Intensity Modulator',
    role: 'Decoy state preparation',
    description:
      'High-speed Lithium Niobate (LiNbO₃) Mach-Zehnder intensity modulator. Modulates pulse intensities randomly between signal (μ), decoy (ν), and vacuum (ω) states to defeat photon-number-splitting (PNS) attacks.',
    specs: 'Vπ = 3.2 V · Extinction Ratio > 30 dB · BW: 10 GHz',
    station: 'Alice',
  },
  pm_alice: {
    id: 'pm_alice',
    name: 'Polarization Modulator (PM)',
    type: 'State Preparation Modulator',
    role: 'Quantum bit encoding',
    description:
      'Electro-optic phase/polarization modulator driven by an FPGA-controlled random sequence. Encodes random bit values {0, 1} across rectilinear (|H⟩, |V⟩) and diagonal (|+⟩, |-⟩) mutually unbiased bases.',
    specs: 'Insertion Loss < 2.5 dB · Switching Rate: 100 MHz',
    station: 'Alice',
  },
  bs: {
    id: 'bs',
    name: '50:50 Beam Splitter (BS)',
    type: 'Passive Optical Splitter',
    role: 'State distribution',
    description:
      'Non-polarizing cube beam splitter dividing Alice’s modulated quantum pulses equally between Bob and Charlie channels with 50% theoretical split ratio, maintaining optical state purity.',
    specs: 'Split: 50:50 ± 1% · AR Coating: 1550 nm',
    station: 'Alice',
  },
  pm_bob: {
    id: 'pm_bob',
    name: 'Bob Polarization Modulator (PM)',
    type: 'Basis Selector',
    role: 'Measurement basis selection',
    description:
      'Receiver polarization controller actively rotating Bob’s measurement basis between rectilinear (Z) and diagonal (X) to detect polarization-encoded quantum signature material.',
    specs: 'Active basis switching · Loss < 2.2 dB',
    station: 'Bob',
  },
  pbs_bob: {
    id: 'pbs_bob',
    name: 'Bob Polarizing Beam Splitter (PBS)',
    type: 'Polarization Demultiplexer',
    role: 'Bit discrimination',
    description:
      'Transmits horizontally polarized photons (|H⟩) directly to detector D1 and reflects vertically polarized photons (|V⟩) at 90° towards detector D2 for deterministic bit measurement.',
    specs: 'Extinction: Tp/Ts > 1000:1 · 1550 nm',
    station: 'Bob',
  },
  d1: {
    id: 'd1',
    name: 'Single-Photon Detector D1',
    type: 'InGaAs SPAD',
    role: 'Bit 0 detection (Bob)',
    description:
      'Gated InGaAs/InP avalanche photodiode operating in Geiger mode to register single-photon arrival events for orthogonal polarization channel 0.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Bob',
  },
  d2: {
    id: 'd2',
    name: 'Single-Photon Detector D2',
    type: 'InGaAs SPAD',
    role: 'Bit 1 detection (Bob)',
    description:
      'Gated InGaAs/InP single-photon detector registering arrival events for orthogonal polarization channel 1 on Bob’s receiver.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Bob',
  },
  pm_charlie: {
    id: 'pm_charlie',
    name: 'Charlie Polarization Modulator (PM)',
    type: 'Basis Selector',
    role: 'Measurement basis selection',
    description:
      'Charlie’s receiver polarization modulator performing random measurement basis switching between rectilinear and diagonal bases independently of Bob.',
    specs: 'Active basis switching · Loss < 2.2 dB',
    station: 'Charlie',
  },
  pbs_charlie: {
    id: 'pbs_charlie',
    name: 'Charlie Polarizing Beam Splitter (PBS)',
    type: 'Polarization Demultiplexer',
    role: 'Bit discrimination',
    description:
      'Separates Charlie’s incoming states into transmitted channel (detector D3) and reflected channel (detector D4) for conclusive bit registration.',
    specs: 'Extinction: Tp/Ts > 1000:1 · 1550 nm',
    station: 'Charlie',
  },
  d3: {
    id: 'd3',
    name: 'Single-Photon Detector D3',
    type: 'InGaAs SPAD',
    role: 'Bit 0 detection (Charlie)',
    description:
      'Single-photon detector registering arrival events for bit 0 on Charlie’s receiver to compile conclusive bit register KC.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Charlie',
  },
  d4: {
    id: 'd4',
    name: 'Single-Photon Detector D4',
    type: 'InGaAs SPAD',
    role: 'Bit 1 detection (Charlie)',
    description:
      'Single-photon detector registering arrival events for bit 1 on Charlie’s receiver.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Charlie',
  },
  fiber_bob: {
    id: 'fiber_bob',
    name: 'Alice → Bob Fiber Channel',
    type: 'SMF-28 Optical Fiber',
    role: 'Quantum state transmission',
    description:
      'Simulated single-mode telecommunication optical fiber connecting Alice’s beam splitter to Bob’s receiver. Applies exponential transmission attenuation and channel loss.',
    specs: 'Loss: 0.20 dB/km · Dispersion: 17 ps/(nm·km)',
    station: 'Channel',
  },
  fiber_charlie: {
    id: 'fiber_charlie',
    name: 'Alice → Charlie Fiber Channel',
    type: 'SMF-28 Optical Fiber',
    role: 'Quantum state transmission',
    description:
      'Simulated single-mode optical fiber connecting Alice’s beam splitter to Charlie’s receiver with independent attenuation and noise processes.',
    specs: 'Loss: 0.20 dB/km · Dispersion: 17 ps/(nm·km)',
    station: 'Channel',
  },
};

export default function VirtualOpticalLaboratory({
  distanceKm,
  fiberAttenuation,
  pulseCount,
  simulationState,
  onGenerate,
  loading = false,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Simulation & View state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [scheme, setScheme] = useState<SchemeType>('scheme1');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showDirection, setShowDirection] = useState<boolean>(true);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [selectedComponent, setSelectedComponent] = useState<string>('am');
  const [highlightFilter, setHighlightFilter] = useState<'All' | 'Alice' | 'Bob' | 'Charlie'>('All');
  const [webglError, setWebglError] = useState<string | null>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const schemeRef = useRef<SchemeType>(scheme);
  const showLabelsRef = useRef<boolean>(showLabels);
  const showDirectionRef = useRef<boolean>(showDirection);
  const isRotatingRef = useRef<boolean>(isRotating);
  const highlightFilterRef = useRef<'All' | 'Alice' | 'Bob' | 'Charlie'>(highlightFilter);
  const selectedComponentRef = useRef<string>(selectedComponent);

  // Spline trajectories & particle arrays
  const pathsRef = useRef<{
    aliceMain: THREE.CatmullRomCurve3;
    toBob: THREE.CatmullRomCurve3;
    toCharlie: THREE.CatmullRomCurve3;
    bobD1: THREE.CatmullRomCurve3;
    bobD2: THREE.CatmullRomCurve3;
    charlieD3: THREE.CatmullRomCurve3;
    charlieD4: THREE.CatmullRomCurve3;
  } | null>(null);

  const particlesRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      path: THREE.CatmullRomCurve3;
      progress: number;
      speed: number;
      branch?: 'bob' | 'charlie';
    }>
  >([]);

  const interactiveMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const schemeGroupsRef = useRef<{
    scheme1Group: THREE.Group;
    scheme2Group: THREE.Group;
  } | null>(null);

  // Synchronize ref copies for render loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    schemeRef.current = scheme;
    if (schemeGroupsRef.current) {
      schemeGroupsRef.current.scheme1Group.visible = scheme === 'scheme1';
      schemeGroupsRef.current.scheme2Group.visible = scheme === 'scheme2';
    }
  }, [scheme]);

  useEffect(() => {
    showLabelsRef.current = showLabels;
  }, [showLabels]);

  useEffect(() => {
    showDirectionRef.current = showDirection;
  }, [showDirection]);

  useEffect(() => {
    isRotatingRef.current = isRotating;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  useEffect(() => {
    highlightFilterRef.current = highlightFilter;
  }, [highlightFilter]);

  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  // Procedural breadboard texture generator
  const createBreadboardTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark anodized metal background
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle brushed metal streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i + Math.random() * 2);
      ctx.lineTo(512, i + Math.random() * 2);
      ctx.stroke();
    }

    // Regular M6 mounting hole grid (Thorlabs style 25mm spacing)
    const spacing = 32;
    for (let x = spacing / 2; x < 512; x += spacing) {
      for (let y = spacing / 2; y < 512; y += spacing) {
        // Outer dark hole cavity
        ctx.beginPath();
        ctx.arc(x, y, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0d14';
        ctx.fill();

        // Metallic chamfer rim highlight
        ctx.beginPath();
        ctx.arc(x, y, 4.8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Inner tapped center
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#141822';
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
    return texture;
  };

  // Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;

    // 1. WebGL Renderer with graceful error handling
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err: any) {
      console.error('WebGL initialization error:', err);
      setWebglError(err?.message || 'WebGL is not supported or hardware acceleration is disabled in your browser.');
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Scene & Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9); // Clean laboratory light background
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);
    sceneRef.current = scene;

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    // Isometric-style elevated view matching reference images
    camera.position.set(-2, 11, 17);
    cameraRef.current = camera;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent dipping beneath table
    controls.minDistance = 6;
    controls.maxDistance = 35;
    controls.target.set(0.2, 0.5, 0);
    controls.autoRotate = isRotatingRef.current;
    controls.autoRotateSpeed = 1.0;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(-6, 18, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 14;
    dirLight.shadow.camera.bottom = -14;
    scene.add(dirLight);

    const cyanRimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    cyanRimLight.position.set(10, 5, -8);
    scene.add(cyanRimLight);

    const softFillLight = new THREE.DirectionalLight(0x94a3b8, 0.6);
    softFillLight.position.set(0, -5, 10);
    scene.add(softFillLight);

    // 6. Floor / Table Surface with soft shadow receiver
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.3;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Grid Floor Overlay
    const gridHelper = new THREE.GridHelper(50, 50, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = -0.28;
    scene.add(gridHelper);

    // 7. Breadboard helper function
    const breadboardTexture = createBreadboardTexture();
    const createBreadboard = (width: number, length: number, pos: THREE.Vector3) => {
      const group = new THREE.Group();
      group.position.copy(pos);

      // Main Aluminum Table top
      const tableGeo = new THREE.BoxGeometry(width, 0.28, length);
      const tableMat = new THREE.MeshStandardMaterial({
        color: 0x1e2430,
        roughness: 0.35,
        metalness: 0.65,
        map: breadboardTexture || undefined,
      });
      const tableMesh = new THREE.Mesh(tableGeo, tableMat);
      tableMesh.castShadow = true;
      tableMesh.receiveShadow = true;
      tableMesh.position.y = 0.14;
      group.add(tableMesh);

      // Metallic edge chamfer rim
      const rimGeo = new THREE.BoxGeometry(width + 0.04, 0.29, length + 0.04);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.2,
        metalness: 0.8,
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.position.y = 0.14;
      rimMesh.castShadow = true;
      group.add(rimMesh);

      // Corner rubber isolation feet
      const footGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.28, 16);
      const footMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      const offsets = [
        [-width / 2 + 0.35, -length / 2 + 0.35],
        [width / 2 - 0.35, -length / 2 + 0.35],
        [-width / 2 + 0.35, length / 2 - 0.35],
        [width / 2 - 0.35, length / 2 - 0.35],
      ];
      offsets.forEach(([ox, oz]) => {
        const foot = new THREE.Mesh(footGeo, footMat);
        foot.position.set(ox, 0.0, oz);
        foot.castShadow = true;
        group.add(foot);
      });

      scene.add(group);
      return group;
    };

    // Breadboard Dimensions & Positions
    // Alice (left, large horizontal)
    createBreadboard(8.2, 3.2, new THREE.Vector3(-4.6, 0, 0));
    // Bob (upper right)
    createBreadboard(6.2, 2.9, new THREE.Vector3(4.5, 0.25, -2.1));
    // Charlie (lower right)
    createBreadboard(6.2, 2.9, new THREE.Vector3(4.5, -0.25, 2.1));

    // 8. Shared component geometries and materials
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.75 });
    const silverMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 });
    const goldBrassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
    const orangeAnodizedMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.35, metalness: 0.5 });
    const opticGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: 0.88,
      opacity: 0.92,
      transparent: true,
      roughness: 0.06,
      ior: 1.52,
      thickness: 0.6,
    });
    const fiberYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.1 });

    // Interactive object registry
    const registry = interactiveMeshesRef.current;
    registry.clear();

    // ── Helper: Register clickable object ──
    const registerClickable = (obj: THREE.Object3D, id: string) => {
      obj.userData = { id, clickable: true };
      registry.set(id, obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData = { id, clickable: true };
        }
      });
    };

    // ── Component Builder 1: Laser Source ──
    const createLaserMesh = () => {
      const laserGroup = new THREE.Group();
      // Main Chassis
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.1), darkMetalMat);
      box.castShadow = true;
      box.position.y = 0.45;
      laserGroup.add(box);

      // Top cooling fins
      for (let i = -0.5; i <= 0.5; i += 0.2) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.0), silverMetalMat);
        fin.position.set(i, 0.93, 0);
        laserGroup.add(fin);
      }

      // Front Aperture & Collimator
      const aperture = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 16), goldBrassMat);
      aperture.rotation.z = Math.PI / 2;
      aperture.position.set(0.95, 0.45, 0);
      aperture.castShadow = true;
      laserGroup.add(aperture);

      // Status indicator light
      const ledGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0.5, 0.7, 0.56);
      laserGroup.add(led);

      // Warning decal representation (yellow triangle)
      const warningDecal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.02, 3),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      warningDecal.rotation.x = Math.PI / 2;
      warningDecal.position.set(0, 0.5, 0.56);
      laserGroup.add(warningDecal);

      // Mounting post & pedestal base
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 16), silverMetalMat);
      post.position.set(0, 0.14, 0);
      post.castShadow = true;
      laserGroup.add(post);

      return laserGroup;
    };

    // ── Component Builder 2: Amplitude Modulator (AM) ──
    const createAMMesh = () => {
      const amGroup = new THREE.Group();
      // Orange Anodized Modulator Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), orangeAnodizedMat);
      body.castShadow = true;
      body.position.y = 0.42;
      amGroup.add(body);

      // Silver side flange plates
      const flangeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.75), silverMetalMat);
      flangeL.position.set(-0.62, 0.42, 0);
      amGroup.add(flangeL);

      const flangeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.75), silverMetalMat);
      flangeR.position.set(0.62, 0.42, 0);
      amGroup.add(flangeR);

      // Optical fiber collimator couplers (input & output)
      [-0.75, 0.75].forEach((x) => {
        const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), goldBrassMat);
        coupler.rotation.z = Math.PI / 2;
        coupler.position.set(x, 0.42, 0);
        amGroup.add(coupler);
      });

      // Top RF modulation connector / heat sink
      const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), silverMetalMat);
      rf.position.set(0, 0.8, 0);
      amGroup.add(rf);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 16), silverMetalMat);
      post.position.set(0, 0.14, 0);
      amGroup.add(post);

      return amGroup;
    };

    // ── Component Builder 3: Polarization Modulator (PM) ──
    const createPMMesh = () => {
      const pmGroup = new THREE.Group();
      // Modulator Housing
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.7, 0.8), darkMetalMat);
      box.castShadow = true;
      box.position.y = 0.45;
      pmGroup.add(box);

      // Top micrometer rotary adjustment knob
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.35, 24), silverMetalMat);
      knob.position.set(0, 0.95, 0);
      knob.castShadow = true;
      pmGroup.add(knob);

      const knobCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24), darkMetalMat);
      knobCap.position.set(0, 1.15, 0);
      pmGroup.add(knobCap);

      // Dial index marker
      const dialPin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), goldBrassMat);
      dialPin.position.set(0.24, 0.95, 0);
      pmGroup.add(dialPin);

      // Input / output ports
      [-0.55, 0.55].forEach((x) => {
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16), goldBrassMat);
        port.rotation.z = Math.PI / 2;
        port.position.set(x, 0.45, 0);
        pmGroup.add(port);
      });

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 16), silverMetalMat);
      post.position.set(0, 0.14, 0);
      pmGroup.add(post);

      return pmGroup;
    };

    // ── Component Builder 4: 50:50 Beam Splitter (BS) & PBS ──
    const createBeamSplitterMesh = (isPBS = false) => {
      const bsGroup = new THREE.Group();

      // Precision 4-post Cage Mount Frame
      const cageFrame = new THREE.Group();
      const topPlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), darkMetalMat);
      topPlate.position.y = 0.92;
      cageFrame.add(topPlate);

      const botPlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), darkMetalMat);
      botPlate.position.y = 0.28;
      cageFrame.add(botPlate);

      const postPositions = [
        [-0.42, -0.42],
        [0.42, -0.42],
        [-0.42, 0.42],
        [0.42, 0.42],
      ];
      postPositions.forEach(([px, pz]) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 12), silverMetalMat);
        p.position.set(px, 0.6, pz);
        cageFrame.add(p);
      });
      bsGroup.add(cageFrame);

      // Translucent Optical Cube Prism
      const cubeSize = 0.62;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), opticGlassMat);
      cube.position.y = 0.6;
      cube.castShadow = true;
      bsGroup.add(cube);

      // Internal 45-degree beam splitting interface
      const splitPlaneGeo = new THREE.PlaneGeometry(cubeSize * Math.SQRT2, cubeSize);
      const splitPlaneMat = new THREE.MeshStandardMaterial({
        color: isPBS ? 0x93c5fd : 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
        metalness: 0.7,
        side: THREE.DoubleSide,
      });
      const splitPlane = new THREE.Mesh(splitPlaneGeo, splitPlaneMat);
      splitPlane.rotation.y = Math.PI / 4;
      splitPlane.position.y = 0.6;
      bsGroup.add(splitPlane);

      // Input port (left)
      const inPort = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), goldBrassMat);
      inPort.rotation.z = Math.PI / 2;
      inPort.position.set(-0.58, 0.6, 0);
      bsGroup.add(inPort);

      // Output ports: straight (right) and orthogonal (front/back)
      const outPortStraight = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), goldBrassMat);
      outPortStraight.rotation.z = Math.PI / 2;
      outPortStraight.position.set(0.58, 0.6, 0);
      bsGroup.add(outPortStraight);

      const outPortOrtho = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), goldBrassMat);
      outPortOrtho.rotation.x = Math.PI / 2;
      outPortOrtho.position.set(0, 0.6, 0.58);
      bsGroup.add(outPortOrtho);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 16), silverMetalMat);
      post.position.set(0, 0.14, 0);
      bsGroup.add(post);

      return bsGroup;
    };

    // ── Component Builder 5: Single-Photon Detector (SPAD) ──
    const createDetectorMesh = (_name = 'D1') => {
      const detGroup = new THREE.Group();
      // Cylindrical detector body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.85, 24), darkMetalMat);
      body.rotation.z = Math.PI / 2;
      body.position.set(0.45, 0.55, 0);
      body.castShadow = true;
      detGroup.add(body);

      // Optical fiber entrance port
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 16), goldBrassMat);
      port.rotation.z = Math.PI / 2;
      port.position.set(-0.1, 0.55, 0);
      detGroup.add(port);

      // BNC electrical output signal jack on rear
      const bnc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16), silverMetalMat);
      bnc.rotation.z = Math.PI / 2;
      bnc.position.set(0.95, 0.55, 0);
      detGroup.add(bnc);

      // Pedestal mounting post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16), silverMetalMat);
      post.position.set(0.45, 0.2, 0);
      detGroup.add(post);

      return detGroup;
    };

    // ── Build Scheme Groups ──
    const scheme1Group = new THREE.Group();
    const scheme2Group = new THREE.Group();
    scene.add(scheme1Group);
    scene.add(scheme2Group);
    schemeGroupsRef.current = { scheme1Group, scheme2Group };

    // Common Alice Laser
    const laserMesh = createLaserMesh();
    laserMesh.position.set(-7.2, 0.28, 0);
    scene.add(laserMesh);
    registerClickable(laserMesh, 'laser');

    // ── Scheme I Setup: Laser → AM → PM → BS ──
    const amScheme1 = createAMMesh();
    amScheme1.position.set(-5.3, 0.28, 0);
    scheme1Group.add(amScheme1);
    registerClickable(amScheme1, 'am');

    const pmAliceScheme1 = createPMMesh();
    pmAliceScheme1.position.set(-3.7, 0.28, 0);
    scheme1Group.add(pmAliceScheme1);
    registerClickable(pmAliceScheme1, 'pm_alice');

    const bsScheme1 = createBeamSplitterMesh(false);
    bsScheme1.position.set(-2.0, 0.28, 0);
    scheme1Group.add(bsScheme1);
    registerClickable(bsScheme1, 'bs');

    // Scheme I inter-component fiber patch cords on Alice
    const createFiberSegment = (start: THREE.Vector3, end: THREE.Vector3, group: THREE.Group) => {
      const curve = new THREE.LineCurve3(start, end);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.035, 8, false), fiberYellowMat);
      tube.castShadow = true;
      group.add(tube);
    };

    createFiberSegment(new THREE.Vector3(-6.2, 0.73, 0), new THREE.Vector3(-6.0, 0.7, 0), scheme1Group);
    createFiberSegment(new THREE.Vector3(-4.6, 0.7, 0), new THREE.Vector3(-4.3, 0.73, 0), scheme1Group);
    createFiberSegment(new THREE.Vector3(-3.1, 0.73, 0), new THREE.Vector3(-2.6, 0.88, 0), scheme1Group);

    // ── Scheme II Setup: Laser → PM → BS → Dual AM Paths ──
    const pmAliceScheme2 = createPMMesh();
    pmAliceScheme2.position.set(-5.0, 0.28, 0);
    scheme2Group.add(pmAliceScheme2);

    const bsScheme2 = createBeamSplitterMesh(false);
    bsScheme2.position.set(-3.2, 0.28, 0);
    scheme2Group.add(bsScheme2);

    // Dual AM units placed on branch paths towards Bob and Charlie
    const amBobScheme2 = createAMMesh();
    amBobScheme2.position.set(-1.2, 0.28, -0.7);
    scheme2Group.add(amBobScheme2);

    const amCharlieScheme2 = createAMMesh();
    amCharlieScheme2.position.set(-1.2, 0.28, 0.7);
    scheme2Group.add(amCharlieScheme2);

    createFiberSegment(new THREE.Vector3(-6.2, 0.73, 0), new THREE.Vector3(-5.6, 0.73, 0), scheme2Group);
    createFiberSegment(new THREE.Vector3(-4.4, 0.73, 0), new THREE.Vector3(-3.8, 0.88, 0), scheme2Group);

    // Initial visibility according to scheme
    scheme1Group.visible = schemeRef.current === 'scheme1';
    scheme2Group.visible = schemeRef.current === 'scheme2';

    // ── Bob Receiver Setup (Upper Right) ──
    const bobGroup = new THREE.Group();
    bobGroup.position.set(0, 0.25, 0); // elevated slightly for visual depth

    const pmBob = createPMMesh();
    pmBob.position.set(2.6, 0.28, -2.1);
    bobGroup.add(pmBob);
    registerClickable(pmBob, 'pm_bob');

    const pbsBob = createBeamSplitterMesh(true);
    pbsBob.position.set(4.3, 0.28, -2.1);
    bobGroup.add(pbsBob);
    registerClickable(pbsBob, 'pbs_bob');

    // Bob Detectors: D1 (transmitted straight) and D2 (reflected)
    const d1Bob = createDetectorMesh('D1');
    d1Bob.position.set(6.2, 0.28, -2.8);
    bobGroup.add(d1Bob);
    registerClickable(d1Bob, 'd1');

    const d2Bob = createDetectorMesh('D2');
    d2Bob.position.set(6.2, 0.28, -1.4);
    bobGroup.add(d2Bob);
    registerClickable(d2Bob, 'd2');

    // Bob internal fiber patch cords
    createFiberSegment(new THREE.Vector3(3.2, 0.73, -2.1), new THREE.Vector3(3.7, 0.88, -2.1), bobGroup);
    // PBS to D1
    createFiberSegment(new THREE.Vector3(4.9, 0.88, -2.1), new THREE.Vector3(6.1, 0.83, -2.8), bobGroup);
    // PBS to D2
    createFiberSegment(new THREE.Vector3(4.3, 0.88, -1.5), new THREE.Vector3(6.1, 0.83, -1.4), bobGroup);

    scene.add(bobGroup);

    // ── Charlie Receiver Setup (Lower Right) ──
    const charlieGroup = new THREE.Group();
    charlieGroup.position.set(0, -0.25, 0);

    const pmCharlie = createPMMesh();
    pmCharlie.position.set(2.6, 0.28, 2.1);
    charlieGroup.add(pmCharlie);
    registerClickable(pmCharlie, 'pm_charlie');

    const pbsCharlie = createBeamSplitterMesh(true);
    pbsCharlie.position.set(4.3, 0.28, 2.1);
    charlieGroup.add(pbsCharlie);
    registerClickable(pbsCharlie, 'pbs_charlie');

    // Charlie Detectors: D3 and D4
    const d3Charlie = createDetectorMesh('D3');
    d3Charlie.position.set(6.2, 0.28, 1.4);
    charlieGroup.add(d3Charlie);
    registerClickable(d3Charlie, 'd3');

    const d4Charlie = createDetectorMesh('D4');
    d4Charlie.position.set(6.2, 0.28, 2.8);
    charlieGroup.add(d4Charlie);
    registerClickable(d4Charlie, 'd4');

    // Charlie internal fiber patch cords
    createFiberSegment(new THREE.Vector3(3.2, 0.73, 2.1), new THREE.Vector3(3.7, 0.88, 2.1), charlieGroup);
    createFiberSegment(new THREE.Vector3(4.9, 0.88, 2.1), new THREE.Vector3(6.1, 0.83, 1.4), charlieGroup);
    createFiberSegment(new THREE.Vector3(4.3, 0.88, 2.7), new THREE.Vector3(6.1, 0.83, 2.8), charlieGroup);

    scene.add(charlieGroup);

    // ── Main Quantum Optical Fiber Channels (Continuous Curved 3D Tubes) ──
    // Fiber 1: Alice BS → Bob PM
    const curveBob = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.4, 0.88, -0.1),
      new THREE.Vector3(-0.3, 1.1, -1.3),
      new THREE.Vector3(1.1, 1.25, -2.1),
      new THREE.Vector3(2.0, 1.01, -2.1),
    ]);

    // Fiber 2: Alice BS → Charlie PM
    const curveCharlie = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.4, 0.88, 0.1),
      new THREE.Vector3(-0.3, 0.6, 1.3),
      new THREE.Vector3(1.1, 0.35, 2.1),
      new THREE.Vector3(2.0, 0.51, 2.1),
    ]);

    const fiberGeoBob = new THREE.TubeGeometry(curveBob, 64, 0.05, 12, false);
    const fiberMeshBob = new THREE.Mesh(fiberGeoBob, fiberYellowMat);
    fiberMeshBob.castShadow = true;
    scene.add(fiberMeshBob);
    registerClickable(fiberMeshBob, 'fiber_bob');

    const fiberGeoCharlie = new THREE.TubeGeometry(curveCharlie, 64, 0.05, 12, false);
    const fiberMeshCharlie = new THREE.Mesh(fiberGeoCharlie, fiberYellowMat);
    fiberMeshCharlie.castShadow = true;
    scene.add(fiberMeshCharlie);
    registerClickable(fiberMeshCharlie, 'fiber_charlie');

    // Golden Connector Boots / Ferrules where fibers plug in
    const createConnectorBoot = (pos: THREE.Vector3, rotY: number) => {
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.28, 16), goldBrassMat);
      boot.rotation.z = Math.PI / 2;
      boot.rotation.y = rotY;
      boot.position.copy(pos);
      scene.add(boot);
    };

    createConnectorBoot(new THREE.Vector3(-1.3, 0.88, -0.1), -0.4);
    createConnectorBoot(new THREE.Vector3(2.1, 1.01, -2.1), 0);
    createConnectorBoot(new THREE.Vector3(-1.3, 0.88, 0.1), 0.4);
    createConnectorBoot(new THREE.Vector3(2.1, 0.51, 2.1), 0);

    // ── Particle System for Simulated Optical Pulses ──
    const aliceMainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.0, 0.73, 0),
      new THREE.Vector3(-5.3, 0.7, 0),
      new THREE.Vector3(-3.7, 0.73, 0),
      new THREE.Vector3(-2.0, 0.88, 0),
    ]);

    const bobD1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.6, 1.01, -2.1),
      new THREE.Vector3(4.3, 1.13, -2.1),
      new THREE.Vector3(6.2, 1.08, -2.8),
    ]);

    const bobD2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.6, 1.01, -2.1),
      new THREE.Vector3(4.3, 1.13, -2.1),
      new THREE.Vector3(6.2, 1.08, -1.4),
    ]);

    const charlieD3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.6, 0.51, 2.1),
      new THREE.Vector3(4.3, 0.63, 2.1),
      new THREE.Vector3(6.2, 0.58, 1.4),
    ]);

    const charlieD4Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.6, 0.51, 2.1),
      new THREE.Vector3(4.3, 0.63, 2.1),
      new THREE.Vector3(6.2, 0.58, 2.8),
    ]);

    pathsRef.current = {
      aliceMain: aliceMainCurve,
      toBob: curveBob,
      toCharlie: curveCharlie,
      bobD1: bobD1Curve,
      bobD2: bobD2Curve,
      charlieD3: charlieD3Curve,
      charlieD4: charlieD4Curve,
    };

    // Create photon packet meshes (elongated cyan/white capsules with glow)
    const particleGeo = new THREE.CapsuleGeometry(0.08, 0.22, 8, 16);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });

    const particles: Array<{
      mesh: THREE.Mesh;
      path: THREE.CatmullRomCurve3;
      progress: number;
      speed: number;
      branch?: 'bob' | 'charlie';
    }> = [];

    // Alice emission stream pulses
    for (let i = 0; i < 4; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      scene.add(pMesh);
      particles.push({
        mesh: pMesh,
        path: aliceMainCurve,
        progress: i * 0.25,
        speed: 0.0035,
      });
    }

    // Bob channel pulses
    for (let i = 0; i < 4; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      scene.add(pMesh);
      particles.push({
        mesh: pMesh,
        path: curveBob,
        progress: (i * 0.25 + 0.1) % 1,
        speed: 0.003,
        branch: 'bob',
      });
    }

    // Charlie channel pulses
    for (let i = 0; i < 4; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      scene.add(pMesh);
      particles.push({
        mesh: pMesh,
        path: curveCharlie,
        progress: (i * 0.25 + 0.15) % 1,
        speed: 0.003,
        branch: 'charlie',
      });
    }

    particlesRef.current = particles;

    // ── Interaction: Raycasting on Hover and Click ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(registry.values()), true);

      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;
        while (target && !target.userData?.id) {
          target = target.parent;
        }
        if (target && target.userData?.id) {
          const compId = target.userData.id;
          setSelectedComponent(compId);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // ── Animation Loop ──
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Update OrbitControls
      controls.update();

      // Update pulse packet particles if playing
      if (isPlayingRef.current) {
        particlesRef.current.forEach((item) => {
          item.progress += item.speed;
          if (item.progress > 1) {
            item.progress = 0;
          }

          const point = item.path.getPointAt(item.progress);
          const tangent = item.path.getTangentAt(item.progress);
          item.mesh.position.copy(point);

          // Align capsule to path direction safely
          if (tangent && tangent.lengthSq() > 0.0001) {
            tangent.normalize();
            const axis = new THREE.Vector3(0, 1, 0);
            item.mesh.quaternion.setFromUnitVectors(axis, tangent);
          }
        });
      }

      renderer.render(scene, camera);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // ── Resize Observer for responsive canvas sizing ──
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });

    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Camera View Controls ──
  const handleResetCamera = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(-2, 11, 17);
      controlsRef.current.target.set(0.2, 0.5, 0);
      controlsRef.current.update();
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(0.85);
      controlsRef.current.update();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(1.15);
      controlsRef.current.update();
    }
  }, []);

  const handleStartSimulation = useCallback(() => {
    setIsPlaying(true);
    if (onGenerate) onGenerate();
  }, [onGenerate]);

  const handlePauseSimulation = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleResetSimulation = useCallback(() => {
    setIsPlaying(false);
    particlesRef.current.forEach((item, index) => {
      item.progress = (index * 0.2) % 1;
      const pt = item.path.getPointAt(item.progress);
      item.mesh.position.copy(pt);
    });
    handleResetCamera();
  }, [handleResetCamera]);

  const currentCompData = COMPONENT_DETAILS[selectedComponent] || COMPONENT_DETAILS['am'];

  if (webglError) {
    return (
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-8 text-center space-y-4 shadow-xs">
        <div className="inline-flex items-center space-x-2 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold">
          <Info className="w-4 h-4 text-rose-600" />
          <span>WebGL Acceleration Required</span>
        </div>
        <h4 className="font-serif text-lg text-[#071842]">Cannot Initialize 3D Quantum Optical Laboratory</h4>
        <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
          {webglError}
        </p>
        <p className="text-[11px] font-mono text-[#94A3B8]">
          Please enable WebGL hardware acceleration in your browser settings (chrome://settings/system) and reload.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* ── Top Bar: Title, Subtitle, and Main Action Controls ──────────────── */}
      <div className="px-5 py-3.5 border-b border-[#CBD5E1] flex flex-wrap items-center justify-between gap-4 bg-white">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#20C8A7] animate-pulse"></span>
            <h3 className="font-serif text-xl sm:text-2xl text-[#071842] tracking-tight">
              Virtual Quantum <span className="text-[#263EDC] font-semibold">Optical Laboratory</span>
            </h3>
          </div>
          <p className="text-xs text-[#475569] mt-0.5">
            Practical QDS Hardware Simulation &amp; Quantum Optical State Distribution
          </p>
        </div>

        {/* Action Controls Group: Start, Pause, Reset & Scheme Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Start / Pause / Reset Simulation Controls */}
          <div className="inline-flex items-center bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg p-0.5 shadow-xs">
            <button
              onClick={handleStartSimulation}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold inline-flex items-center space-x-1.5 transition-all ${
                isPlaying
                  ? 'bg-[#263EDC] text-white shadow-xs'
                  : 'text-[#071842] hover:bg-white'
              }`}
              title="Start or resume photon packet animation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Simulating...' : 'Start Simulation'}</span>
            </button>

            <button
              onClick={handlePauseSimulation}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold inline-flex items-center space-x-1.5 transition-all ${
                !isPlaying
                  ? 'bg-white text-[#071842] shadow-xs'
                  : 'text-[#64748B] hover:text-[#071842] hover:bg-white'
              }`}
              title="Pause pulse propagation"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>

            <button
              onClick={handleResetSimulation}
              className="px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold text-[#64748B] hover:text-[#071842] hover:bg-white transition-all inline-flex items-center space-x-1"
              title="Reset optical particles and camera"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Scheme Selector: Scheme I vs Scheme II */}
          <div className="inline-flex items-center bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg p-0.5 shadow-xs">
            <button
              onClick={() => setScheme('scheme1')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                scheme === 'scheme1'
                  ? 'bg-[#263EDC] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#071842]'
              }`}
              title="Scheme I: Laser → AM → PM → BS"
            >
              Scheme I
            </button>
            <button
              onClick={() => setScheme('scheme2')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                scheme === 'scheme2'
                  ? 'bg-[#263EDC] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#071842]'
              }`}
              title="Scheme II: Laser → PM → BS → Dual AM Paths"
            >
              Scheme II
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 3D Canvas Area with HTML Overlays ──────────────────────────── */}
      <div className="relative w-full h-[480px] sm:h-[540px] bg-slate-100 overflow-hidden select-none">
        {/* Three.js Mounting Div */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* ── Floating Breadboard Station Badges (Matching Reference Image 1 & 2) ── */}
        {showLabels && (
          <>
            {/* Alice Floating Badge */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-lg px-3 py-2 shadow-sm pointer-events-none transition-all">
              <span className="text-[10px] font-mono font-bold text-[#263EDC] block uppercase tracking-wider">
                Quantum State Source
              </span>
              <span className="font-serif font-bold text-[#071842] text-sm block">Alice Station</span>
              <span className="text-[10px] font-mono text-[#64748B] block mt-0.5">
                {scheme === 'scheme1'
                  ? 'Config: Laser → AM → PM → 50:50 BS'
                  : 'Config: Laser → PM → 50:50 BS → AM'}
              </span>
            </div>

            {/* Bob Receiver Floating Badge */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-lg px-3 py-2 shadow-sm pointer-events-none transition-all">
              <span className="text-[10px] font-mono font-bold text-[#20C8A7] block uppercase tracking-wider">
                Receiver
              </span>
              <span className="font-serif font-bold text-[#071842] text-sm block">Bob Station</span>
              <span className="text-[10px] font-mono text-[#64748B] block mt-0.5">
                PM · PBS · SPAD Detectors D1 &amp; D2
              </span>
            </div>

            {/* Charlie Receiver Floating Badge */}
            <div className="absolute bottom-16 right-4 bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-lg px-3 py-2 shadow-sm pointer-events-none transition-all">
              <span className="text-[10px] font-mono font-bold text-[#20C8A7] block uppercase tracking-wider">
                Receiver
              </span>
              <span className="font-serif font-bold text-[#071842] text-sm block">Charlie Station</span>
              <span className="text-[10px] font-mono text-[#64748B] block mt-0.5">
                PM · PBS · SPAD Detectors D3 &amp; D4
              </span>
            </div>

            {/* Dynamic Fiber Channel Badges (Live Parameter Reflection) */}
            <div className="absolute top-[28%] left-[45%] -translate-x-1/2 bg-white/90 backdrop-blur-md border border-[#CBD5E1] rounded-md px-2.5 py-1 text-[10px] font-mono text-[#071842] shadow-xs pointer-events-none">
              <span className="font-bold text-[#263EDC]">Fiber Channel — {distanceKm} km</span>
              <span className="text-[#64748B] block">Loss: {(distanceKm * fiberAttenuation).toFixed(2)} dB</span>
            </div>

            <div className="absolute bottom-[36%] left-[45%] -translate-x-1/2 bg-white/90 backdrop-blur-md border border-[#CBD5E1] rounded-md px-2.5 py-1 text-[10px] font-mono text-[#071842] shadow-xs pointer-events-none">
              <span className="font-bold text-[#263EDC]">Fiber Channel — {distanceKm} km</span>
              <span className="text-[#64748B] block">Loss: {(distanceKm * fiberAttenuation).toFixed(2)} dB</span>
            </div>
          </>
        )}

        {/* ── Implementation View Mini-Diagram (Matching Reference Image 2) ── */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-lg p-2.5 shadow-xs max-w-xs text-[10px] font-mono hidden sm:block">
          <div className="flex items-center space-x-1 text-[#64748B] font-bold uppercase tracking-wider mb-1">
            <Layers className="w-3 h-3 text-[#263EDC]" />
            <span>Implementation View</span>
          </div>
          {scheme === 'scheme1' ? (
            <div className="flex items-center space-x-1 text-slate-700">
              <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-semibold">Laser</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300 font-semibold">AM</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-semibold">PM</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 bg-sky-100 text-sky-900 rounded border border-sky-300 font-semibold">50:50 BS</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-slate-700">
              <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-semibold">Laser</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-semibold">PM</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 bg-sky-100 text-sky-900 rounded border border-sky-300 font-semibold">50:50 BS</span>
              <span>→</span>
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300 font-semibold">AM Paths</span>
            </div>
          )}
        </div>

        {/* ── Interactive View Controls Toolbar ──────────────────────────────── */}
        <div className="absolute bottom-3 right-3 flex items-center space-x-1.5 bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-lg p-1 shadow-xs text-xs font-mono">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              isRotating ? 'text-[#263EDC] font-bold' : 'text-[#64748B]'
            }`}
            title="Toggle turntable auto-rotation"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-slate-100 text-[#64748B] hover:text-[#071842] transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-slate-100 text-[#64748B] hover:text-[#071842] transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded hover:bg-slate-100 text-[#64748B] hover:text-[#071842] transition-colors"
            title="Reset perspective"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-[#CBD5E1]"></div>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              showLabels ? 'text-[#263EDC]' : 'text-[#94A3B8]'
            }`}
            title="Toggle 3D component and station labels"
          >
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Lower Section: Component Legend & Inspector (Reference Image 2) ── */}
      <div className="border-t border-[#CBD5E1] bg-[#F8FAF9] p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Component Legend (5 cols) */}
        <div className="md:col-span-5 bg-white border border-[#CBD5E1] rounded-lg p-3 space-y-2 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block border-b border-slate-100 pb-1">
            Optical Hardware Legend
          </span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-mono">
            <button
              onClick={() => setSelectedComponent('laser')}
              className={`flex items-center space-x-2 p-1 rounded text-left transition-colors ${
                selectedComponent === 'laser' ? 'bg-slate-100 font-bold text-[#071842]' : 'text-[#475569]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-[#18181b] border border-slate-400"></span>
              <span>Laser Source</span>
            </button>
            <button
              onClick={() => setSelectedComponent('am')}
              className={`flex items-center space-x-2 p-1 rounded text-left transition-colors ${
                selectedComponent === 'am' ? 'bg-slate-100 font-bold text-[#071842]' : 'text-[#475569]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]"></span>
              <span>AM (Intensity)</span>
            </button>
            <button
              onClick={() => setSelectedComponent('pm_alice')}
              className={`flex items-center space-x-2 p-1 rounded text-left transition-colors ${
                selectedComponent === 'pm_alice' ? 'bg-slate-100 font-bold text-[#071842]' : 'text-[#475569]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-[#334155]"></span>
              <span>PM (Polarization)</span>
            </button>
            <button
              onClick={() => setSelectedComponent('bs')}
              className={`flex items-center space-x-2 p-1 rounded text-left transition-colors ${
                selectedComponent === 'bs' ? 'bg-slate-100 font-bold text-[#071842]' : 'text-[#475569]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8] opacity-75"></span>
              <span>50:50 Beam Splitter</span>
            </button>
            <button
              onClick={() => setSelectedComponent('pbs_bob')}
              className={`flex items-center space-x-2 p-1 rounded text-left transition-colors ${
                selectedComponent === 'pbs_bob' ? 'bg-slate-100 font-bold text-[#071842]' : 'text-[#475569]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-[#93c5fd]"></span>
              <span>PBS (Polarizing)</span>
            </button>
            <button
              onClick={() => setSelectedComponent('d1')}
              className={`flex items-center space-x-2 p-1 rounded text-left transition-colors ${
                selectedComponent === 'd1' ? 'bg-slate-100 font-bold text-[#071842]' : 'text-[#475569]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
              <span>D1–D4 SPADs</span>
            </button>
            <button
              onClick={() => setSelectedComponent('fiber_bob')}
              className={`col-span-2 flex items-center space-x-2 p-1 rounded text-left transition-colors ${
                selectedComponent === 'fiber_bob' ? 'bg-slate-100 font-bold text-[#071842]' : 'text-[#475569]'
              }`}
            >
              <span className="w-4 h-1.5 rounded-full bg-[#facc15]"></span>
              <span>Fiber Channels (SMF-28, Loss {fiberAttenuation} dB/km)</span>
            </button>
          </div>
        </div>

        {/* Component Inspector (7 cols) */}
        <div className="md:col-span-7 bg-white border border-[#CBD5E1] rounded-lg p-3 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <div className="flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-[#263EDC]" />
              <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider">
                Component Inspector: {currentCompData.station}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-[#071842] font-semibold">
              {currentCompData.type}
            </span>
          </div>

          <div>
            <h4 className="font-serif font-bold text-[#071842] text-sm">{currentCompData.name}</h4>
            <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">{currentCompData.description}</p>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#64748B] border-t border-slate-50">
            <span>
              <strong className="text-[#071842]">Role:</strong> {currentCompData.role}
            </span>
            <span>
              <strong className="text-[#071842]">Specs:</strong> {currentCompData.specs}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
