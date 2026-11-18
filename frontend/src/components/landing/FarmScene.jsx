import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Clone, useGLTF } from '@react-three/drei'


function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.13, 1.1, 7]} />
        <meshStandardMaterial color="#594B38" />
      </mesh>

      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.65, 1.5, 7]} />
        <meshStandardMaterial color="#294C38" flatShading />
      </mesh>

      <mesh position={[0, 1.9, 0]} castShadow receiveShadow >
        <coneGeometry args={[0.45, 1.1, 7]} />
        <meshStandardMaterial color="#496B50" flatShading />
      </mesh>
    </group>
  )
}

function Cow({ position, scale = 1, rotation = [0, 0, 0] }) {
  const { scene } = useGLTF('/models/cow.glb')

  return (
    <Clone
  object={scene}
  position={position}
  scale={scale}
  rotation={rotation}
  castShadow
  receiveShadow
/>
  )
}

useGLTF.preload('/models/cow.glb')
function FarmLandscape() {
  return (
    <>
      <ambientLight intensity={0.8} />

      <directionalLight
        position={[-4, 8, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0001}
      />

      {/* Background hills */}
      <mesh position={[2, -1.3, -5]} scale={[7, 1.8, 2]} receiveShadow>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color="#294C3B" flatShading />
      </mesh>

      <mesh position={[6, -1.2, -3]} scale={[5, 1.5, 2]} receiveShadow>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color="#496B50" flatShading />
      </mesh>

      <mesh position={[3, -2.15, 0.5]} scale={[9, 0.55, 3.8]} receiveShadow>
        <sphereGeometry args={[1, 64, 32]} />
        <meshStandardMaterial color="#657D4E" roughness={1} flatShading={false} />
      </mesh>

      {/* Trees */}
      <Tree position={[-0.5, 0.35, -5]} scale={1.1} />
      <Tree position={[4.5, -1.2, -2.5]} scale={1.35} />
      <Tree position={[7, -1.3, -1.5]} scale={0.9} />
      <Tree position={[8, -1.4, -3]} scale={1.2} />

      {/* Cattle */}
      <Cow position={[4.5, -1.88, 2.5]} scale={2.5} rotation={[0.15, -1.6, 0]} />
      <Cow position={[2, 0.45, -5]} scale={0.7} rotation={[0, 1, 0]} />

      {/* Sun */}
      <mesh position={[5, 4, -6]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color="#DCE0B5" />
      </mesh>
    </>
  )
}


function ParallaxCamera({ scrollProgress }) {
  const { size } = useThree()
  const isMobile = size.width <= 640

  const initialY = isMobile ? -0.3 : 0.5
  const initialZ = isMobile ? 6 : 10

  const currentZ = useRef(initialZ)
  const currentX = useRef(0)

  useFrame(({ camera, pointer }, delta) => {
    const progress = scrollProgress.current

    const targetZ = initialZ - progress * 4
    const mobileOffset = isMobile ? 2.0 : 0
    const targetX = mobileOffset + pointer.x * 0.12

    const smoothness = 3.5
    const damping = 1 - Math.exp(-smoothness * delta)

    currentZ.current += (targetZ - currentZ.current) * damping
    currentX.current += (targetX - currentX.current) * damping

    camera.position.x = currentX.current
    camera.position.y = initialY
    camera.position.z = currentZ.current

    camera.rotation.set(0, 0, 0)
  })

  return null
}


export default function FarmScene() {
  const scrollProgress = useRef(0)

useEffect(() => {
const handleScroll = () => {
  console.log('SCROLL TERDETEKSI', window.scrollY)

  const progress = Math.max(
    0,
    Math.min(window.scrollY / window.innerHeight, 1)
  )

  scrollProgress.current = progress
}

  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()

  return () => {
    window.removeEventListener('scroll', handleScroll)
  }
}, [])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2.5, 12], fov: 42 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <FarmLandscape />
        </Suspense>

        <ParallaxCamera scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  )
}