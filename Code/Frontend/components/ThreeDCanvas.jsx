"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeDCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Dimensions
    let width = container.clientWidth;
    let height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Group to hold the mesh objects
    const group = new THREE.Group();
    scene.add(group);

    // Create the geometry (Sphere)
    const radius = 2.0;
    const segments = 64;
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    // Keep track of the original vertex positions for displacement calculations
    const positionAttr = geometry.attributes.position;
    const vertexCount = positionAttr.count;
    const originalPositions = new Float32Array(positionAttr.array);

    // Materials
    // 1. Matte, non-reflective deep black material
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x050505, // deep black
      roughness: 0.8,  // Matte texture
      metalness: 0.15, // Low metalness
      transparent: true,
      opacity: 0.95,
      flatShading: false,
    });

    // 2. Silver-gray wireframe grid on top (matches the reference screenshot)
    const wireMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888, // light silver/gray grid lines
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      emissive: 0x444444, // subtle silver-gray glow
      emissiveIntensity: 0.15,
    });

    // Create meshes
    const baseMesh = new THREE.Mesh(geometry, baseMaterial);
    const wireMesh = new THREE.Mesh(geometry, wireMaterial);

    group.add(baseMesh);
    group.add(wireMesh);

    // Lights (Monochromatic/White lights to maintain the pure black and gray aesthetic)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5); // Soft white fill light
    dirLight2.position.set(-5, -5, 5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 0.7, 30); // Soft white center highlight
    pointLight.position.set(0, 0, 4);
    scene.add(pointLight);

    // Timer for time-based animation (THREE.Clock is deprecated)
    const timer = new THREE.Timer();

    // Mouse & Auto Rotation Tracking
    let targetX = 0;
    let targetY = 0;
    let autoRotationY = 0;
    let mouseXOffset = 0;
    let mouseYOffset = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Normalize between -0.5 and 0.5
      targetX = (x / rect.width - 0.5) * 0.6;
      targetY = (y / rect.height - 0.5) * 0.6;
    };

    container.addEventListener("mousemove", handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      timer.update();
      const time = timer.getElapsed() * 0.45; // slowed down for elegance
      const positions = positionAttr.array;

      // Apply dynamic multi-wave noise displacement to vertices
      for (let i = 0; i < vertexCount; i++) {
        const idx = i * 3;
        const ox = originalPositions[idx];
        const oy = originalPositions[idx + 1];
        const oz = originalPositions[idx + 2];

        // Normal direction from center (0,0,0)
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / len;
        const ny = oy / len;
        const nz = oz / len;

        // Combine high and low frequency sine waves to simulate 3D noise
        let displacement = Math.sin(ox * 1.5 + time * 1.2) * Math.cos(oy * 1.5 + time * 1.2) * 0.22;
        displacement += Math.sin(oz * 3.0 + time * 2.0) * Math.cos(ox * 3.0 + time * 2.0) * 0.10;
        displacement += Math.sin(oy * 6.0 - time * 3.0) * 0.04;

        // Displace the vertex along its normal
        positions[idx] = ox + nx * displacement;
        positions[idx + 1] = oy + ny * displacement;
        positions[idx + 2] = oz + nz * displacement;
      }

      // Tell Three.js the vertices changed
      positionAttr.needsUpdate = true;

      // Recompute normals for proper dynamic lighting shading
      geometry.computeVertexNormals();

      // Increment the continuous automatic rotation angle
      autoRotationY += 0.003; // automatic continuous rotation speed

      // Smoothly interpolate the mouse offsets (easing)
      mouseXOffset += (targetX - mouseXOffset) * 0.05;
      mouseYOffset += (targetY - mouseYOffset) * 0.05;

      // Apply combined automatic rotation + mouse gesture tilt
      group.rotation.y = autoRotationY + mouseXOffset;
      group.rotation.x = mouseYOffset;

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      renderer.dispose();
      geometry.dispose();
      baseMaterial.dispose();
      wireMaterial.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
