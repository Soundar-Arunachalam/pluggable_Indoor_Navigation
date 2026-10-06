import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Level, LevelMapData, POI, RouteResponse } from '../../types/client';
import { useStudioStore, RenderStyle, CameraPreset } from '../../stores/studioStore';
import { useUIStore } from '../../stores/uiStore';
import { Layers, Compass, Eye, Sparkles, Box, ShieldCheck } from 'lucide-react';

interface StudioCanvasProps {
  levels: Level[];
  activeLevel: Level | null;
  levelMap: LevelMapData | null;
  allLevelMaps: Record<string, LevelMapData>; // preloaded or loaded level maps
  route: RouteResponse | null;
  onSelectPOI?: (poi: POI) => void;
  onSelectUnit?: (unitFeature: any) => void;
}

// ── Color Schemes per RenderStyle ──────────────────────────────────────────────
const STYLES_CONFIG: Record<RenderStyle, {
  bg: number;
  floor: number;
  floorOpacity: number;
  wallDefault: number;
  wallOpacity: number;
  edgeColor: number;
  gridColor1: number;
  gridColor2: number;
  wireframe: boolean;
  ambientIntensity: number;
  dirLightIntensity: number;
}> = {
  blueprint: {
    bg: 0x0a1628,
    floor: 0x0d2137,
    floorOpacity: 0.9,
    wallDefault: 0x1e40af,
    wallOpacity: 0.65,
    edgeColor: 0x60a5fa,
    gridColor1: 0x1d4ed8,
    gridColor2: 0x1e293b,
    wireframe: false,
    ambientIntensity: 0.9,
    dirLightIntensity: 1.2,
  },
  clay: {
    bg: 0xf1f5f9,
    floor: 0xe2e8f0,
    floorOpacity: 1.0,
    wallDefault: 0xffffff,
    wallOpacity: 1.0,
    edgeColor: 0x64748b,
    gridColor1: 0xcbd5e1,
    gridColor2: 0xe2e8f0,
    wireframe: false,
    ambientIntensity: 0.7,
    dirLightIntensity: 1.4,
  },
  glass: {
    bg: 0x030712,
    floor: 0x111827,
    floorOpacity: 0.7,
    wallDefault: 0x0284c7,
    wallOpacity: 0.35,
    edgeColor: 0x38bdf8,
    gridColor1: 0x1f2937,
    gridColor2: 0x111827,
    wireframe: false,
    ambientIntensity: 1.0,
    dirLightIntensity: 1.0,
  },
  realistic: {
    bg: 0x0f172a,
    floor: 0x1e293b,
    floorOpacity: 1.0,
    wallDefault: 0x334155,
    wallOpacity: 0.95,
    edgeColor: 0x94a3b8,
    gridColor1: 0x334155,
    gridColor2: 0x1e293b,
    wireframe: false,
    ambientIntensity: 0.8,
    dirLightIntensity: 1.5,
  },
  cyberpunk: {
    bg: 0x090514,
    floor: 0x120a2a,
    floorOpacity: 0.85,
    wallDefault: 0xd946ef,
    wallOpacity: 0.5,
    edgeColor: 0x22d3ee,
    gridColor1: 0xa855f7,
    gridColor2: 0x3b0764,
    wireframe: false,
    ambientIntensity: 1.2,
    dirLightIntensity: 1.0,
  },
  wireframe: {
    bg: 0x020617,
    floor: 0x0f172a,
    floorOpacity: 0.2,
    wallDefault: 0x38bdf8,
    wallOpacity: 1.0,
    edgeColor: 0x38bdf8,
    gridColor1: 0x0284c7,
    gridColor2: 0x0f172a,
    wireframe: true,
    ambientIntensity: 1.5,
    dirLightIntensity: 0.5,
  },
};

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  levels,
  activeLevel,
  levelMap,
  allLevelMaps,
  route,
  onSelectPOI,
  onSelectUnit,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useUIStore();

  const {
    renderStyle,
    cameraPreset,
    activeStudioTool,
    wallHeightMeters,
    explodeSpacingMeters,
    isMultiFloorExploded,
    showGrid,
    showPOILabels,
    showWalkways3D,
    placedObjects,
    selected3DObject,
    setSelected3DObject,
    addPlacedObject,
    selectedPaletteItem,
    measurePoints,
    addMeasurePoint,
  } = useStudioStore();

  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const measureGroupRef = useRef<THREE.Group | null>(null);
  const particleGroupRef = useRef<THREE.Group | null>(null);

  // Animation frame request
  const animFrameIdRef = useRef<number | null>(null);

  // ── Helper: GeoJSON Polygon to THREE Shape ───────────────────────────────────
  const createShapeFromCoords = (coords: number[][]): THREE.Shape | null => {
    if (!coords || coords.length < 3) return null;
    const shape = new THREE.Shape();
    coords.forEach(([x, y], idx) => {
      // In Three.js 3D space: X = x, Y = height (elevation), Z = y
      if (idx === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    return shape;
  };

  // ── Setup & Initialization ──────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const currentStyle = STYLES_CONFIG[renderStyle];
    scene.background = new THREE.Color(currentStyle.bg);
    scene.fog = new THREE.FogExp2(currentStyle.bg, 0.005);

    // Camera (Perspective default)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(60, 70, 90);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear old children
    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // don't go below ground level
    controls.minDistance = 5;
    controls.maxDistance = 300;
    controls.target.set(30, 0, 30);
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, currentStyle.ambientIntensity);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, currentStyle.dirLightIntensity);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 300;
    const d = 100;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 1.5, 100);
    pointLight.position.set(30, 20, 30);
    scene.add(pointLight);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    objectsGroupRef.current = rootGroup;

    // Route Group
    const routeGroup = new THREE.Group();
    scene.add(routeGroup);
    routeGroupRef.current = routeGroup;

    // Measure Group
    const measureGroup = new THREE.Group();
    scene.add(measureGroup);
    measureGroupRef.current = measureGroup;

    // Particles Group
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    particleGroupRef.current = particleGroup;

    // FPS loop
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      controls.update();

      // Animate particles along route if any
      const time = performance.now() * 0.002;
      particleGroup.children.forEach((p, idx) => {
        p.position.y += Math.sin(time + idx) * 0.02;
      });

      renderer.render(scene, camera);

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
    };

    animate();

    // Resize listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, []);

  // ── Update Render Style & Background ────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    const style = STYLES_CONFIG[renderStyle];
    sceneRef.current.background = new THREE.Color(style.bg);
    if (sceneRef.current.fog) {
      sceneRef.current.fog.color = new THREE.Color(style.bg);
    }
  }, [renderStyle]);

  // ── Handle Camera Preset Switching ──────────────────────────────────────────
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Determine center focus point from active level
    const widthM = activeLevel?.width_meters || 80;
    const heightM = activeLevel?.height_meters || 60;
    const centerX = widthM / 2;
    const centerZ = heightM / 2;
    controls.target.set(centerX, 0, centerZ);

    switch (cameraPreset) {
      case 'perspective':
        camera.position.set(centerX + 40, 50, centerZ + 60);
        break;
      case 'isometric_sw':
        camera.position.set(centerX - 60, 60, centerZ + 60);
        break;
      case 'isometric_ne':
        camera.position.set(centerX + 60, 60, centerZ - 60);
        break;
      case 'top_down':
        camera.position.set(centerX, 110, centerZ + 0.1);
        break;
      case 'front_elevation':
        camera.position.set(centerX, 15, centerZ + 90);
        break;
      case 'first_person':
        camera.position.set(centerX - 20, 2.0, centerZ - 10);
        break;
    }
    controls.update();
  }, [cameraPreset, activeLevel?.width_meters, activeLevel?.height_meters]);

  // ── Build Multi-Floor 3D Scene Geometry ─────────────────────────────────────
  useEffect(() => {
    const root = objectsGroupRef.current;
    if (!root) return;

    // Clear old 3D objects
    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
    }

    const style = STYLES_CONFIG[renderStyle];
    const displayLevels = levels.length > 0 ? levels : (activeLevel ? [activeLevel] : []);

    displayLevels.forEach((lvl) => {
      // Find level map data (either active map or cached map)
      const mapData = (activeLevel?.id === lvl.id ? levelMap : allLevelMaps[lvl.id]) || levelMap;
      if (!mapData) return;

      const levelOrdinal = lvl.ordinal;
      const isCurrentLevel = activeLevel?.id === lvl.id;

      // Compute elevation (Y axis in Three.js)
      const elevationY = isMultiFloorExploded
        ? levelOrdinal * (wallHeightMeters + explodeSpacingMeters)
        : levelOrdinal * wallHeightMeters;

      const levelGroup = new THREE.Group();
      levelGroup.position.set(0, elevationY, 0);

      // Floor Slab
      const widthM = lvl.width_meters || 80;
      const heightM = lvl.height_meters || 60;

      const floorGeo = new THREE.BoxGeometry(widthM, 0.4, heightM);
      const floorMat = new THREE.MeshStandardMaterial({
        color: isCurrentLevel ? style.floor : (isDarkMode ? 0x111827 : 0xe2e8f0),
        roughness: 0.6,
        metalness: 0.1,
        transparent: style.floorOpacity < 1,
        opacity: isCurrentLevel ? style.floorOpacity : 0.4,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(widthM / 2, -0.2, heightM / 2);
      floorMesh.receiveShadow = true;
      levelGroup.add(floorMesh);

      // Grid Overlay on Floor
      if (showGrid) {
        const grid = new THREE.GridHelper(Math.max(widthM, heightM), 20, style.gridColor1, style.gridColor2);
        grid.position.set(widthM / 2, 0.01, heightM / 2);
        levelGroup.add(grid);
      }

      // Units 3D Extrusion
      mapData.units.features.forEach((unit) => {
        const geom = unit.geometry;
        if (!geom?.coordinates) return;

        let rings: number[][][] = [];
        if (geom.type === 'Polygon') rings = [geom.coordinates[0]];
        else if (geom.type === 'MultiPolygon') rings = geom.coordinates.map((p: any) => p[0]);

        rings.forEach((coords) => {
          const shape = createShapeFromCoords(coords);
          if (!shape) return;

          const extrudeSettings: THREE.ExtrudeGeometryOptions = {
            depth: wallHeightMeters,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.05,
            bevelThickness: 0.05,
          };

          const extrudeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          // Rotate shape so flat base is on XZ plane and extrudes up along Y axis
          extrudeGeo.rotateX(Math.PI / 2);

          const unitColor = unit.properties.color
            ? parseInt(unit.properties.color.replace('#', '0x'), 16)
            : style.wallDefault;

          const mat = new THREE.MeshStandardMaterial({
            color: unitColor,
            roughness: 0.4,
            metalness: 0.2,
            wireframe: style.wireframe,
            transparent: style.wallOpacity < 1.0,
            opacity: style.wallOpacity,
          });

          const mesh = new THREE.Mesh(extrudeGeo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { type: 'unit', id: unit.id, name: unit.properties.name, unit };
          levelGroup.add(mesh);

          // Wireframe Edge Highlights
          if (!style.wireframe) {
            const edges = new THREE.EdgesGeometry(extrudeGeo);
            const lineMat = new THREE.LineBasicMaterial({ color: style.edgeColor, linewidth: 1.5 });
            const line = new THREE.LineSegments(edges, lineMat);
            levelGroup.add(line);
          }

          // 3D Floating Name Label Pillar
          if (showPOILabels && unit.properties.name) {
            let tx = 0, ty = 0, pc = 0;
            coords.forEach(([x, y]) => { tx += x; ty += y; pc++; });
            if (pc > 0) {
              const cx = tx / pc;
              const cz = ty / pc;

              // Pillar marker
              const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, wallHeightMeters + 1.2, 8);
              const pillarMat = new THREE.MeshBasicMaterial({ color: style.edgeColor, transparent: true, opacity: 0.5 });
              const pillar = new THREE.Mesh(pillarGeo, pillarMat);
              pillar.position.set(cx, (wallHeightMeters + 1.2) / 2, cz);
              levelGroup.add(pillar);
            }
          }
        });
      });

      // Walkway Network 3D Paths
      if (showWalkways3D && mapData.edges) {
        mapData.edges.features.forEach((edge) => {
          const coords = edge.geometry?.coordinates;
          if (!coords || coords.length < 2) return;
          const [p1, p2] = coords;
          if (edge.properties?.is_vertical) {
            // Render 3D Elevator/Stair vertical shaft tube!
            const points = [
              new THREE.Vector3(p1[0], 0, p1[1]),
              new THREE.Vector3(p2[0], wallHeightMeters + explodeSpacingMeters, p2[1]),
            ];
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeo = new THREE.TubeGeometry(curve, 10, 0.4, 8, false);
            const tubeMat = new THREE.MeshStandardMaterial({
              color: 0x3b82f6,
              emissive: 0x1d4ed8,
              emissiveIntensity: 0.6,
              transparent: true,
              opacity: 0.8,
            });
            const tube = new THREE.Mesh(tubeGeo, tubeMat);
            levelGroup.add(tube);
          } else {
            // Ground walkway dash line
            const points = [
              new THREE.Vector3(p1[0], 0.05, p1[1]),
              new THREE.Vector3(p2[0], 0.05, p2[1]),
            ];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineDashedMaterial({
              color: style.edgeColor,
              dashSize: 1,
              gapSize: 0.5,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            levelGroup.add(line);
          }
        });
      }

      // 3D POI Pins
      if (mapData.pois) {
        mapData.pois.features.forEach((poi) => {
          const [px, py] = poi.geometry.coordinates;

          const pinGroup = new THREE.Group();
          pinGroup.position.set(px, 0, py);

          // Base disc
          const discGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
          const discMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
          const disc = new THREE.Mesh(discGeo, discMat);
          disc.position.y = 0.05;
          pinGroup.add(disc);

          // Floating Pin Diamond / Sphere
          const pinGeo = new THREE.OctahedronGeometry(0.5);
          const pinMat = new THREE.MeshStandardMaterial({
            color: poi.properties.is_accessible ? 0x16a34a : 0x2563eb,
            emissive: poi.properties.is_accessible ? 0x15803d : 0x1d4ed8,
            emissiveIntensity: 0.5,
            roughness: 0.2,
          });
          const pinMesh = new THREE.Mesh(pinGeo, pinMat);
          pinMesh.position.y = wallHeightMeters + 1.5;
          pinMesh.userData = { type: 'poi', poi };
          pinGroup.add(pinMesh);

          // Connecting light stem
          const stemPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, wallHeightMeters + 1.5, 0),
          ];
          const stemGeo = new THREE.BufferGeometry().setFromPoints(stemPoints);
          const stemMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.6 });
          const stem = new THREE.Line(stemGeo, stemMat);
          pinGroup.add(stem);

          levelGroup.add(pinGroup);
        });
      }

      root.add(levelGroup);
    });
  }, [
    levels,
    activeLevel?.id,
    levelMap,
    allLevelMaps,
    renderStyle,
    wallHeightMeters,
    explodeSpacingMeters,
    isMultiFloorExploded,
    showGrid,
    showPOILabels,
    showWalkways3D,
    isDarkMode,
  ]);

  // ── Render Placed 3D Furniture & Custom Objects ─────────────────────────────
  useEffect(() => {
    const root = objectsGroupRef.current;
    if (!root) return;

    // Filter placed objects for active level or all
    placedObjects.forEach((obj) => {
      const objGroup = new THREE.Group();
      const elevationY = isMultiFloorExploded
        ? (activeLevel?.ordinal || 0) * (wallHeightMeters + explodeSpacingMeters)
        : (activeLevel?.ordinal || 0) * wallHeightMeters;

      objGroup.position.set(obj.x, elevationY + obj.z, obj.y);
      objGroup.rotation.y = (obj.rotation * Math.PI) / 180;

      const objColor = obj.color ? parseInt(obj.color.replace('#', '0x'), 16) : 0x3b82f6;

      if (obj.modelType === 'desk') {
        const topGeo = new THREE.BoxGeometry(obj.scale[0], 0.1, obj.scale[2]);
        const topMat = new THREE.MeshStandardMaterial({ color: objColor, roughness: 0.3 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = obj.scale[1];
        objGroup.add(top);

        // 4 Legs
        const legGeo = new THREE.CylinderGeometry(0.05, 0.05, obj.scale[1], 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dz]) => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set((dx * (obj.scale[0] - 0.2)) / 2, obj.scale[1] / 2, (dz * (obj.scale[2] - 0.2)) / 2);
          objGroup.add(leg);
        });
      } else if (obj.modelType === 'kiosk') {
        const bodyGeo = new THREE.BoxGeometry(obj.scale[0], obj.scale[1], obj.scale[2]);
        const bodyMat = new THREE.MeshStandardMaterial({ color: objColor, metalness: 0.5, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = obj.scale[1] / 2;
        objGroup.add(body);

        // Glowing Screen
        const screenGeo = new THREE.PlaneGeometry(obj.scale[0] * 0.8, obj.scale[1] * 0.4);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, obj.scale[1] * 0.7, obj.scale[2] / 2 + 0.01);
        objGroup.add(screen);
      } else {
        // Generic architectural block
        const boxGeo = new THREE.BoxGeometry(obj.scale[0], obj.scale[1], obj.scale[2]);
        const boxMat = new THREE.MeshStandardMaterial({ color: objColor });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = obj.scale[1] / 2;
        objGroup.add(box);
      }

      objGroup.userData = { type: 'placed_object', placedObj: obj };
      root.add(objGroup);
    });
  }, [placedObjects, activeLevel?.ordinal, wallHeightMeters, explodeSpacingMeters, isMultiFloorExploded]);

  // ── Render Animated 3D Path Route Ribbons ──────────────────────────────────
  useEffect(() => {
    const routeGroup = routeGroupRef.current;
    const particleGroup = particleGroupRef.current;
    if (!routeGroup || !particleGroup) return;

    while (routeGroup.children.length > 0) routeGroup.remove(routeGroup.children[0]);
    while (particleGroup.children.length > 0) particleGroup.remove(particleGroup.children[0]);

    if (!route || !route.waypoints || route.waypoints.length < 2) return;

    // Convert waypoints to 3D points in workspace coordinates
    const points3D: THREE.Vector3[] = [];

    route.waypoints.forEach((wp) => {
      const levelObj = levels.find((l) => l.id === wp.levelId) || activeLevel;
      const levelOrdinal = levelObj ? levelObj.ordinal : wp.levelOrdinal || 0;

      const elevationY = isMultiFloorExploded
        ? levelOrdinal * (wallHeightMeters + explodeSpacingMeters)
        : levelOrdinal * wallHeightMeters;

      points3D.push(new THREE.Vector3(wp.x, elevationY + 0.6, wp.y));
    });

    if (points3D.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(points3D);
      const tubeGeo = new THREE.TubeGeometry(curve, points3D.length * 10, 0.35, 12, false);

      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: 0x2563eb,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
      });

      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      routeGroup.add(tubeMesh);

      // Glowing pulse particles along curve
      const numParticles = 8;
      for (let i = 0; i < numParticles; i++) {
        const pGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const pMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        const pt = curve.getPoint(i / numParticles);
        pMesh.position.copy(pt);
        particleGroup.add(pMesh);
      }
    }
  }, [route, levels, activeLevel, wallHeightMeters, explodeSpacingMeters, isMultiFloorExploded]);

  // ── Raycasting Mouse Click Handler for Element Selection & Placement ───────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitObj = hit.object;

      // Click placement tool
      if (activeStudioTool === 'place_object' && selectedPaletteItem) {
        addPlacedObject({
          level_id: activeLevel?.id || 'default',
          name: selectedPaletteItem.name,
          category: selectedPaletteItem.category,
          modelType: selectedPaletteItem.modelType,
          x: Math.round(hit.point.x * 10) / 10,
          y: Math.round(hit.point.z * 10) / 10,
          z: 0,
          scale: selectedPaletteItem.scale,
          rotation: 0,
          color: selectedPaletteItem.color,
        });
        return;
      }

      // Measurement tool
      if (activeStudioTool === 'measure') {
        addMeasurePoint({
          x: Math.round(hit.point.x * 100) / 100,
          y: Math.round(hit.point.z * 100) / 100,
          z: Math.round(hit.point.y * 100) / 100,
          levelId: activeLevel?.id || '',
        });
        return;
      }

      // Object Selection
      if (hitObj.userData?.type === 'poi' && onSelectPOI) {
        onSelectPOI(hitObj.userData.poi);
        setHoveredInfo(`Selected POI: ${hitObj.userData.poi.name}`);
      } else if (hitObj.userData?.type === 'unit' && onSelectUnit) {
        onSelectUnit(hitObj.userData.unit);
        setHoveredInfo(`Selected Unit: ${hitObj.userData.name}`);
      } else if (hitObj.userData?.type === 'placed_object') {
        setSelected3DObject(hitObj.userData.placedObj);
        setHoveredInfo(`Selected Object: ${hitObj.userData.placedObj.name}`);
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair"
      />

      {/* Top HUD Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
        <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold
          ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-white/80 border-slate-200 text-slate-800'}`}>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>3D WebGL Engine</span>
          <span className="text-[10px] text-slate-400 font-mono">({fps} FPS)</span>
        </div>

        {activeLevel && (
          <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg text-xs font-bold flex items-center gap-1.5
            ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-blue-400' : 'bg-white/80 border-slate-200 text-blue-700'}`}>
            <Layers className="w-3.5 h-3.5" />
            <span>Active: {activeLevel.name}</span>
          </div>
        )}
      </div>

      {/* Selected Element Hover Banner */}
      {hoveredInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl animate-in slide-in-from-top-2">
          {hoveredInfo}
        </div>
      )}

      {/* Bottom Status / Measurement Display */}
      {measurePoints.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 text-white px-5 py-2.5 rounded-2xl border border-blue-500/40 shadow-2xl flex items-center gap-4 text-xs font-medium backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold">
            <Sparkles className="w-4 h-4" /> 3D Measurement Mode
          </div>
          <div>Points: {measurePoints.length}</div>
          {useStudioStore.getState().measuredDistanceMeters !== null && (
            <div className="text-emerald-400 font-extrabold text-sm border-l border-slate-700 pl-3">
              Distance: {useStudioStore.getState().measuredDistanceMeters?.toFixed(2)} m
            </div>
          )}
          <button
            onClick={() => useStudioStore.getState().clearMeasurePoints()}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
