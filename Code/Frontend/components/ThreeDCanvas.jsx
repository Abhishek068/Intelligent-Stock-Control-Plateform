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

    
    let width = container.clientWidth;
    let height = container.clientHeight;

    
    const scene = new THREE.Scene();

    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7;

    
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    
    const group = new THREE.Group();
    scene.add(group);

    
    const radius = 2.0;
    const segments = 64;
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    
    const positionAttr = geometry.attributes.position;
    const vertexCount = positionAttr.count;
    const originalPositions = new Float32Array(positionAttr.array);

    
    
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x050505, 
      roughness: 0.8,  
      metalness: 0.15, 
      transparent: true,
      opacity: 0.95,
      flatShading: false,
    });

    
    const wireMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888, 
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      emissive: 0x444444, 
      emissiveIntensity: 0.15,
    });

    
    const baseMesh = new THREE.Mesh(geometry, baseMaterial);
    const wireMesh = new THREE.Mesh(geometry, wireMaterial);

    group.add(baseMesh);
    group.add(wireMesh);

    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5); 
    dirLight2.position.set(-5, -5, 5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 0.7, 30); 
    pointLight.position.set(0, 0, 4);
    scene.add(pointLight);

    
    const timer = new THREE.Timer();

    
    let targetX = 0;
    let targetY = 0;
    let autoRotationY = 0;
    let mouseXOffset = 0;
    let mouseYOffset = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      
      targetX = (x / rect.width - 0.5) * 0.6;
      targetY = (y / rect.height - 0.5) * 0.6;
    };

    container.addEventListener("mousemove", handleMouseMove);

    
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      timer.update();
      const time = timer.getElapsed() * 0.45; 
      const positions = positionAttr.array;

      
      for (let i = 0; i < vertexCount; i++) {
        const idx = i * 3;
        const ox = originalPositions[idx];
        const oy = originalPositions[idx + 1];
        const oz = originalPositions[idx + 2];

        
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / len;
        const ny = oy / len;
        const nz = oz / len;

        
        let displacement = Math.sin(ox * 1.5 + time * 1.2) * Math.cos(oy * 1.5 + time * 1.2) * 0.22;
        displacement += Math.sin(oz * 3.0 + time * 2.0) * Math.cos(ox * 3.0 + time * 2.0) * 0.10;
        displacement += Math.sin(oy * 6.0 - time * 3.0) * 0.04;

        
        positions[idx] = ox + nx * displacement;
        positions[idx + 1] = oy + ny * displacement;
        positions[idx + 2] = oz + nz * displacement;
      }

      
      positionAttr.needsUpdate = true;

      
      geometry.computeVertexNormals();

      
      autoRotationY += 0.003; 

      
      mouseXOffset += (targetX - mouseXOffset) * 0.05;
      mouseYOffset += (targetY - mouseYOffset) * 0.05;

      
      group.rotation.y = autoRotationY + mouseXOffset;
      group.rotation.x = mouseYOffset;

      renderer.render(scene, camera);
    };

    animate();

    
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
