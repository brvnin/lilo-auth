import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- HEXAGON GRID SHADER MATERIAL ---
const HexGridMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#000000') },
        uEmissive: { value: new THREE.Color('#06b6d4') }
    },
    vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vElevation;

        // Simplex noise function (approximate)
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vUv = uv;
            
            vec4 modelPosition = instanceMatrix * vec4(position, 1.0);
            
            // Slow, random ambient movement using noise
            float noiseFreq = 0.15;
            float noiseAmp = 2.5;
            float noiseSpeed = 0.2;
            
            float elevation = snoise(vec2(modelPosition.x * noiseFreq + uTime * noiseSpeed, modelPosition.y * noiseFreq)) * noiseAmp;
            
            // Secondary wave for detail
            float wave = sin(modelPosition.x * 0.5 + uTime * 0.5) * sin(modelPosition.y * 0.5 + uTime * 0.3) * 0.5;
            
            modelPosition.z += elevation + wave;
            vElevation = elevation + wave;

            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;

            gl_Position = projectedPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uEmissive;
        varying float vElevation;
        varying vec2 vUv;

        void main() {
            vec3 color = uColor;
            
            // Glow based on elevation
            float glowStrength = smoothstep(-1.0, 2.5, vElevation);
            color = mix(color, uEmissive, glowStrength * 0.5);

            gl_FragColor = vec4(color, 1.0);
        }
    `
});

function HexagonGrid() {
    const meshRef = useRef(null);
    const { viewport } = useThree();

    // Grid parameters
    const hexRadius = 0.6;
    const hexWidth = hexRadius * 2;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const gap = 0.1;

    // Calculate grid size to cover viewport
    // We'll just make a large enough grid to cover most screens
    const cols = 40;
    const rows = 25;
    const count = cols * rows;

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        if (meshRef.current) {
            let i = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Hexagon positioning logic
                    let x = (c * (hexWidth + gap) * 0.75) - (cols * hexWidth * 0.75) / 2;
                    let y = (r * (hexHeight + gap)) - (rows * hexHeight) / 2;

                    // Offset every other column
                    if (c % 2 !== 0) {
                        y += (hexHeight + gap) / 2;
                    }

                    dummy.position.set(x, y, 0);
                    dummy.rotation.x = Math.PI / 2; // Rotate to face camera if using Cylinder
                    dummy.rotation.y = Math.PI / 6; // Rotate to point up
                    dummy.updateMatrix();

                    meshRef.current.setMatrixAt(i++, dummy.matrix);
                }
            }
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [cols, rows, hexWidth, hexHeight, gap, dummy]);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.material.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            {/* Cylinder with 6 segments = Hexagon */}
            <cylinderGeometry args={[0.6, 0.6, 0.2, 6]} />
            <primitive object={HexGridMaterial} attach="material" />
        </instancedMesh>
    );
}

export default function ThreeBackground() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none bg-black">
            <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
                <color attach="background" args={['#050505']} />

                <HexagonGrid />

                {/* Lighting to catch the metallic edges if we used standard material, 
                    but we are using shader. Let's keep ambient for safety. */}
                <ambientLight intensity={0.5} />

                <EffectComposer>
                    <Bloom
                        luminanceThreshold={0.2}
                        luminanceSmoothing={0.9}
                        height={300}
                        intensity={1.5}
                    />
                    <Noise opacity={0.05} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}
