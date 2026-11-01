import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { STATUS_META, ZONES, statusOf, type RoomProfile, type ZoneId } from '../lib/model'

export interface SceneProps {
  room: RoomProfile
  zoneConc: Record<ZoneId, number>
  selectedZone: ZoneId
  onSelectZone: (z: ZoneId) => void
  filterOn: boolean
  units: number
  unitZone: ZoneId
  reduced: boolean
  active: boolean
  sourceLevel: number // 0..1 visual only
}

const MAX_PARTICLES = 1800
const C_REF = 80 // µg/m³ that maps to "every particle visible"; fixed so densities are comparable between scenarios

export function zoneRect(z: ZoneId, L: number, W: number) {
  switch (z) {
    case 'board': return { cx: 0, cz: -0.375 * W, w: L, d: W / 4 }
    case 'back': return { cx: 0, cz: 0.375 * W, w: L, d: W / 4 }
    case 'door': return { cx: -L / 4, cz: 0, w: L / 2, d: W / 2 }
    case 'window': return { cx: L / 4, cz: 0, w: L / 2, d: W / 2 }
  }
}

function zoneAt(x: number, z: number, W: number): ZoneId {
  if (z < -W / 4) return 'board'
  if (z > W / 4) return 'back'
  return x < 0 ? 'door' : 'window'
}

const vert = /* glsl */ `
attribute float aSize; attribute float aVis; attribute float aTint;
varying float vVis; varying float vTint; uniform float uScale;
void main(){
  vVis = aVis; vTint = aTint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / -mv.z * step(0.02, aVis);
  gl_Position = projectionMatrix * mv;
}`
const frag = /* glsl */ `
varying float vVis; varying float vTint; uniform vec3 uColA; uniform vec3 uColB;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(mix(uColA, uColB, vTint), a * vVis * 0.85);
}`

function Particles(p: SceneProps) {
  const { room: R } = p
  const L = R.length
  const W = R.width
  const H = R.height
  const ref = useRef<THREE.Points>(null)
  const props = useRef(p)
  props.current = p
  const invalidate = useThree((s) => s.invalidate)

  const data = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3)
    const vel = new Float32Array(MAX_PARTICLES * 3)
    const size = new Float32Array(MAX_PARTICLES)
    const vis = new Float32Array(MAX_PARTICLES)
    const tint = new Float32Array(MAX_PARTICLES)
    const thr = new Float32Array(MAX_PARTICLES)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      size[i] = (Math.random() < 0.15 ? 0.3 : 0.15) * (0.7 + Math.random() * 0.6)
      tint[i] = Math.random() < 0.65 ? 0 : 1
      thr[i] = Math.random()
    }
    return { pos, vel, size, vis, tint, thr }
  }, [])

  const spawn = (i: number, Lc: number, Wc: number, Hc: number) => {
    const { pos, vel } = data
    const r = Math.random()
    let x: number, y: number, z: number
    if (r < 0.5) { x = Lc / 2 - 0.1; z = (Math.random() - 0.5) * Wc * 0.9; y = 0.6 + Math.random() * (Hc - 1) } // window wall infiltration
    else if (r < 0.7) { x = -Lc / 2 + 0.15; z = (Math.random() - 0.2) * Wc * 0.6; y = 0.2 + Math.random() * 1.6 } // door
    else { x = (Math.random() - 0.5) * Lc; z = (Math.random() - 0.5) * Wc; y = 0.3 + Math.random() * (Hc - 0.5) }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
    vel[i * 3] = (Math.random() - 0.5) * 0.1; vel[i * 3 + 1] = (Math.random() - 0.5) * 0.05; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1
  }

  useLayoutEffect(() => {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      data.pos[i * 3] = (Math.random() - 0.5) * L
      data.pos[i * 3 + 1] = 0.2 + Math.random() * (H - 0.3)
      data.pos[i * 3 + 2] = (Math.random() - 0.5) * W
      data.vel[i * 3] = (Math.random() - 0.5) * 0.1
      data.vel[i * 3 + 1] = (Math.random() - 0.5) * 0.05
      data.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1
    }
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, W, H])

  useEffect(() => { invalidate() }, [p.zoneConc, p.filterOn, p.units, p.unitZone, invalidate])

  const uniforms = useMemo(
    () => ({ uScale: { value: 520 }, uColA: { value: new THREE.Color('#16D6BC') }, uColB: { value: new THREE.Color('#57C8E8') } }),
    [],
  )

  const units = useMemo(() => {
    const out: THREE.Vector3[] = []
    const rect = zoneRect(p.unitZone, L, W)
    for (let i = 0; i < p.units; i++) out.push(new THREE.Vector3(rect.cx + (i - (p.units - 1) / 2) * 0.7, 0.55, rect.cz))
    return out
  }, [p.unitZone, p.units, L, W])

  useFrame((state, dtRaw) => {
    const pts = ref.current
    if (!pts) return
    const cur = props.current
    const dt = Math.min(dtRaw, 0.05)
    const { pos, vel, vis, thr } = data
    const geo = pts.geometry
    const t = state.clock.elapsedTime
    const ease = cur.reduced ? 1 : 0.08
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const ix = i * 3
      if (!cur.reduced) {
        // conceptual drift only: random walk with weak swirl; this is NOT computational fluid dynamics
        vel[ix] += (Math.random() - 0.5) * 0.5 * dt + Math.sin(t * 0.3 + pos[ix + 2]) * 0.01 * dt
        vel[ix + 1] += (Math.random() - 0.5) * 0.3 * dt
        vel[ix + 2] += (Math.random() - 0.5) * 0.5 * dt + Math.cos(t * 0.25 + pos[ix]) * 0.01 * dt
        if (cur.filterOn) {
          for (const u of units) {
            const dx = u.x - pos[ix], dy = u.y - pos[ix + 1], dz = u.z - pos[ix + 2]
            const d = Math.hypot(dx, dy, dz)
            if (d < 2.4) {
              const k = (0.9 / (d + 0.35)) * dt
              vel[ix] += (dx / d) * k; vel[ix + 1] += (dy / d) * k; vel[ix + 2] += (dz / d) * k
            }
            if (d < 0.35) spawn(i, L, W, H)
          }
        }
        vel[ix] *= 0.985; vel[ix + 1] *= 0.985; vel[ix + 2] *= 0.985
        pos[ix] += vel[ix] * dt * 4; pos[ix + 1] += vel[ix + 1] * dt * 4; pos[ix + 2] += vel[ix + 2] * dt * 4
        if (pos[ix] < -L / 2 || pos[ix] > L / 2 || pos[ix + 2] < -W / 2 || pos[ix + 2] > W / 2 || pos[ix + 1] < 0.05 || pos[ix + 1] > H) spawn(i, L, W, H)
      }
      const zc = cur.zoneConc[zoneAt(pos[ix], pos[ix + 2], W)]
      const target = zc / C_REF >= thr[i] ? 1 : 0
      vis[i] += (target - vis[i]) * ease
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aVis.needsUpdate = true
    if (cur.reduced) return
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.size, 1]} />
        <bufferAttribute attach="attributes-aVis" args={[data.vis, 1]} />
        <bufferAttribute attach="attributes-aTint" args={[data.tint, 1]} />
      </bufferGeometry>
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Desks({ L, W }: { L: number; W: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const items = useMemo(() => {
    const out: [number, number][] = []
    const x0 = -L / 2 + 1.6
    const x1 = L / 2 - 1.3
    const z0 = -W / 2 + 1.9
    const z1 = W / 2 - 0.8
    const nx = Math.max(1, Math.floor((x1 - x0) / 1.25) + 1)
    const nz = Math.max(1, Math.floor((z1 - z0) / 1.0) + 1)
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([nx === 1 ? 0 : x0 + (i * (x1 - x0)) / (nx - 1), nz === 1 ? 0 : z0 + (j * (z1 - z0)) / (nz - 1)])
    return out
  }, [L, W])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D()
    items.forEach(([x, z], i) => {
      d.position.set(x, 0.38, z)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [items])
  return (
    <instancedMesh key={items.length} ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.9, 0.06, 0.55]} />
      <meshStandardMaterial color="#143a4c" roughness={0.6} metalness={0.2} emissive="#0b2a38" emissiveIntensity={0.4} />
    </instancedMesh>
  )
}

function Purifiers({ units, unitZone, on, L, W, reduced }: { units: number; unitZone: ZoneId; on: boolean; L: number; W: number; reduced: boolean }) {
  const rings = useRef<(THREE.Mesh | null)[]>([])
  useFrame((s) => {
    if (reduced) return
    rings.current.forEach((m, i) => {
      if (!m) return
      const k = on ? 1 + 0.12 * Math.sin(s.clock.elapsedTime * 2.2 + i) : 1
      m.scale.set(k, k, 1)
    })
  })
  const rect = zoneRect(unitZone, L, W)
  return (
    <group>
      {Array.from({ length: units }, (_, i) => {
        const x = rect.cx + (i - (units - 1) / 2) * 0.7
        return (
          <group key={i} position={[x, 0, rect.cz]}>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.22, 0.26, 0.7, 32]} />
              <meshStandardMaterial color={on ? '#0f4b52' : '#2a4452'} roughness={0.4} metalness={0.4} emissive={on ? '#16D6BC' : '#000000'} emissiveIntensity={on ? 0.35 : 0} />
            </mesh>
            <mesh ref={(el) => { rings.current[i] = el }} position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2, 0.018, 12, 48]} />
              <meshBasicMaterial color={on ? '#16D6BC' : '#4d6572'} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Room(p: SceneProps) {
  const { room: R } = p
  const L = R.length, W = R.width, H = R.height
  const wallMat = <meshStandardMaterial color="#0c2532" transparent opacity={0.16} side={THREE.DoubleSide} />
  const hover = useRef<ZoneId | null>(null)
  return (
    <group>
      {/* floor */}
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[L + 0.2, 0.06, W + 0.2]} />
        <meshStandardMaterial color="#0a1d2a" roughness={0.9} />
      </mesh>
      <gridHelper args={[Math.max(L, W) + 0.2, Math.round(Math.max(L, W) + 0.2), '#2c6577', '#143545']} position={[0, 0.005, 0]} />
      {/* drei quirk: the first Html mounted in a scene can fail to render, so a hidden sacrificial one goes first */}
      <Html position={[0, -5, 0]} style={{ pointerEvents: 'none', opacity: 0 }}><span /></Html>
      {/* zone overlays */}
      {ZONES.map((z) => {
        const rect = zoneRect(z.id, L, W)
        const c = p.zoneConc[z.id]
        const col = STATUS_META[statusOf(c)].color
        const sel = p.selectedZone === z.id
        return (
          <group key={z.id}>
            <mesh
              position={[rect.cx, 0.02, rect.cz]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => { e.stopPropagation(); p.onSelectZone(z.id) }}
              onPointerOver={() => { hover.current = z.id; document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { hover.current = null; document.body.style.cursor = '' }}
            >
              <planeGeometry args={[rect.w - 0.06, rect.d - 0.06]} />
              <meshBasicMaterial color={col} transparent opacity={sel ? 0.3 : 0.12} depthWrite={false} />
            </mesh>
            {sel && (
              <lineSegments position={[rect.cx, 0.03, rect.cz]} rotation={[-Math.PI / 2, 0, 0]}>
                <edgesGeometry args={[new THREE.PlaneGeometry(rect.w - 0.06, rect.d - 0.06)]} />
                <lineBasicMaterial color="#F7FBFD" />
              </lineSegments>
            )}
            <Html position={[rect.cx, 0.15, rect.cz]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
              <div style={{ textAlign: 'center', whiteSpace: 'nowrap', textShadow: '0 1px 6px #071622' }}>
                <div style={{ font: '500 10px "IBM Plex Mono", monospace', letterSpacing: '.12em', color: '#cfe3ea', textTransform: 'uppercase' }}>{z.label}</div>
                <div style={{ font: '500 15px "IBM Plex Mono", monospace', color: col }}>{c.toFixed(1)}<span style={{ fontSize: 10, color: '#8FA9B6' }}> µg/m³</span></div>
              </div>
            </Html>
            <mesh position={[rect.cx, 0.9, rect.cz]}>
              <sphereGeometry args={[sel ? 0.1 : 0.07, 16, 16]} />
              <meshBasicMaterial color={col} />
            </mesh>
          </group>
        )
      })}
      {/* walls: board wall (-z), door wall (-x), window wall (+x); the camera-side wall is omitted */}
      <mesh position={[0, H / 2, -W / 2]}><boxGeometry args={[L, H, 0.05]} />{wallMat}</mesh>
      <mesh position={[-L / 2, H / 2, 0]}><boxGeometry args={[0.05, H, W]} />{wallMat}</mesh>
      <mesh position={[L / 2, H / 2, 0]}><boxGeometry args={[0.05, H, W]} />{wallMat}</mesh>
      <mesh position={[0, H * 0.55, -W / 2 + 0.04]}><boxGeometry args={[Math.min(3.2, L * 0.6), 1.1, 0.03]} /><meshStandardMaterial color="#0a2a36" emissive="#16D6BC" emissiveIntensity={0.12} /></mesh>
      {[-0.28, 0, 0.28].map((o, i) => (
        <mesh key={i} position={[L / 2 - 0.04, H * 0.58, o * W]}><boxGeometry args={[0.03, 1.2, Math.min(1.3, W * 0.2)]} /><meshStandardMaterial color="#57C8E8" transparent opacity={0.28} emissive="#57C8E8" emissiveIntensity={0.5} /></mesh>
      ))}
      <mesh position={[-L / 2 + 0.04, 1.0, -W * 0.15]}><boxGeometry args={[0.03, 2.0, 0.9]} /><meshStandardMaterial color="#8FA9B6" transparent opacity={0.3} /></mesh>
      <Desks L={L} W={W} />
      <Purifiers units={p.units} unitZone={p.unitZone} on={p.filterOn} L={L} W={W} reduced={p.reduced} />
      <Particles {...p} />
    </group>
  )
}

export default function AirLabScene(p: SceneProps) {
  const L = p.room.length, W = p.room.width, H = p.room.height
  const cam: [number, number, number] = [L * 0.6 + 1.9, H + 2.3, W * 0.8 + 2.7]
  return (
    <Canvas
      frameloop={p.active && !p.reduced ? 'always' : 'demand'}
      camera={{ position: cam, fov: 40, near: 0.1, far: 80 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      aria-label="Interactive 3D classroom with illustrative particle visualization"
      role="img"
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 7, 3]} intensity={1.1} color="#cfeeff" />
      <pointLight position={[-L / 2, H, 0]} intensity={8} color="#16D6BC" distance={9} />
      <Room {...p} />
      <OrbitControls enablePan={false} target={[0, 1, 0]} minDistance={4} maxDistance={20} maxPolarAngle={Math.PI / 2 - 0.06} enableDamping={!p.reduced} />
    </Canvas>
  )
}
