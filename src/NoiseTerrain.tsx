import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI, { type Controller } from 'lil-gui'
import { computeHeightmap, computeLayerMap } from './noise/heightmap'
import { heightToColor } from './noise/terrainColor'
import { createDefaultLayer, type NoiseLayer } from './noise/layer'
import type { NoiseType } from './noise/generators'
import type { ShapingType } from './noise/shaping'
import type { BlendMode } from './noise/blend'
import { drawGrayscale } from './noise/drawGrayscale'
import { simulateErosionStep, DEFAULT_EROSION_PARAMS, type ErosionParams } from './noise/erosion'
import { mulberry32 } from './noise/prng'
import './NoiseTerrain.css'

const WORLD_SIZE = 20
const NOISE_TYPES: NoiseType[] = ['simplex', 'value', 'worley', 'fbm']
const SHAPING_TYPES: ShapingType[] = ['none', 'power', 'smoothstep', 'terrace', 'invert', 'clamp']
const BLEND_MODES: BlendMode[] = ['add', 'subtract', 'multiply', 'max', 'min', 'screen', 'replace']

interface AppState {
  resolution: number
  heightScale: number
  previewMode: string
  layers: NoiseLayer[]
}

function NoiseTerrain() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const controlsPanelRef = useRef<HTMLDivElement>(null)
  const canvas2DRef = useRef<HTMLCanvasElement>(null)
  const erosionCanvasRef = useRef<HTMLCanvasElement>(null)
  const noiseTabBtnRef = useRef<HTMLButtonElement>(null)
  const erosionTabBtnRef = useRef<HTMLButtonElement>(null)
  const noisePanelRef = useRef<HTMLDivElement>(null)
  const erosionPanelRef = useRef<HTMLDivElement>(null)
  const startBtnRef = useRef<HTMLButtonElement>(null)
  const stopBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const controlsPanel = controlsPanelRef.current
    const canvas2D = canvas2DRef.current
    const erosionCanvas = erosionCanvasRef.current
    const noiseTabBtn = noiseTabBtnRef.current
    const erosionTabBtn = erosionTabBtnRef.current
    const noisePanel = noisePanelRef.current
    const erosionPanel = erosionPanelRef.current
    const startBtn = startBtnRef.current
    const stopBtn = stopBtnRef.current
    if (
      !viewport ||
      !controlsPanel ||
      !canvas2D ||
      !erosionCanvas ||
      !noiseTabBtn ||
      !erosionTabBtn ||
      !noisePanel ||
      !erosionPanel ||
      !startBtn ||
      !stopBtn
    ) {
      return
    }

    const state: AppState = {
      resolution: 64,
      heightScale: 4,
      previewMode: 'Final Blend',
      layers: [createDefaultLayer(true)],
    }

    // ---------------------------------------------------------------------
    // three.js scene setup
    // ---------------------------------------------------------------------
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x14161c)

    const camera = new THREE.PerspectiveCamera(
      50,
      viewport.clientWidth / viewport.clientHeight,
      0.1,
      1000,
    )
    camera.position.set(WORLD_SIZE * 0.6, WORLD_SIZE * 0.55, WORLD_SIZE * 0.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(viewport.clientWidth, viewport.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    viewport.appendChild(renderer.domElement)

    const orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.enableDamping = true
    orbitControls.dampingFactor = 0.05

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(8, 12, 6)
    scene.add(dirLight)

    let geometry = new THREE.PlaneGeometry(
      WORLD_SIZE,
      WORLD_SIZE,
      state.resolution - 1,
      state.resolution - 1,
    )
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(state.resolution * state.resolution * 3), 3),
    )

    const solidMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const solidMesh = new THREE.Mesh(geometry, solidMaterial)
    solidMesh.rotation.x = -Math.PI / 2
    scene.add(solidMesh)

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const wireMesh = new THREE.Mesh(geometry, wireMaterial)
    wireMesh.rotation.x = -Math.PI / 2
    scene.add(wireMesh)

    const ctx2D = canvas2D.getContext('2d')
    const ctxErosion = erosionCanvas.getContext('2d')
    let lastBuiltResolution = state.resolution
    let currentFinalMap = new Float32Array(state.resolution * state.resolution)

    function rebuildGeometry() {
      const res = state.resolution
      const newGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, res - 1, res - 1)
      newGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(res * res * 3), 3),
      )
      geometry.dispose()
      geometry = newGeometry
      solidMesh.geometry = geometry
      wireMesh.geometry = geometry
      lastBuiltResolution = res
    }

    function regenerate() {
      const res = state.resolution
      if (res !== lastBuiltResolution) rebuildGeometry()

      const finalMap = computeHeightmap(state.layers, res)
      currentFinalMap = finalMap

      const posAttr = geometry.attributes.position as THREE.BufferAttribute
      const colorAttr = geometry.attributes.color as THREE.BufferAttribute
      for (let p = 0; p < finalMap.length; p++) {
        const h = finalMap[p]
        posAttr.setZ(p, (h - 0.5) * state.heightScale)
        const [r, g, b] = heightToColor(h)
        colorAttr.setXYZ(p, r / 255, g / 255, b / 255)
      }
      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true
      geometry.computeVertexNormals()

      let previewMap = finalMap
      if (state.previewMode !== 'Final Blend') {
        const layer = state.layers.find((l) => l.name === state.previewMode)
        if (layer) previewMap = computeLayerMap(layer, res)
      }

      if (ctx2D) drawGrayscale(ctx2D, res, previewMap)

      // Editing the noise re-seeds the erosion simulation baseline to match the new terrain.
      resetErosionFromCurrent()
    }

    // ---------------------------------------------------------------------
    // hydraulic erosion simulation (runs over the final blended noise map)
    // ---------------------------------------------------------------------
    const erosionParams: ErosionParams = { ...DEFAULT_EROSION_PARAMS }
    const erosionRand = mulberry32(Date.now() & 0xffffffff)
    let erosionMap = new Float32Array(state.resolution * state.resolution)
    let erosionResolution = state.resolution
    let erosionRunning = false
    let erosionAnimId: number | null = null

    function resetErosionFromCurrent() {
      erosionMap = currentFinalMap.slice()
      erosionResolution = state.resolution
      if (ctxErosion) drawGrayscale(ctxErosion, erosionResolution, erosionMap)
    }

    function erosionTick() {
      if (!erosionRunning) return
      simulateErosionStep(erosionMap, erosionResolution, erosionParams, erosionRand)
      if (ctxErosion) drawGrayscale(ctxErosion, erosionResolution, erosionMap)
      erosionAnimId = requestAnimationFrame(erosionTick)
    }

    const startErosion = () => {
      if (erosionRunning) return
      erosionRunning = true
      startBtn.disabled = true
      stopBtn.disabled = false
      erosionTick()
    }

    const stopErosion = () => {
      erosionRunning = false
      if (erosionAnimId !== null) cancelAnimationFrame(erosionAnimId)
      erosionAnimId = null
      startBtn.disabled = false
      stopBtn.disabled = true
    }

    startBtn.addEventListener('click', startErosion)
    stopBtn.addEventListener('click', stopErosion)

    const showTab = (tab: 'noise' | 'erosion') => {
      const showNoise = tab === 'noise'
      noisePanel.hidden = !showNoise
      erosionPanel.hidden = showNoise
      noiseTabBtn.classList.toggle('active', showNoise)
      erosionTabBtn.classList.toggle('active', !showNoise)
    }
    noiseTabBtn.addEventListener('click', () => showTab('noise'))
    erosionTabBtn.addEventListener('click', () => showTab('erosion'))

    // ---------------------------------------------------------------------
    // lil-gui controls
    // ---------------------------------------------------------------------
    const gui = new GUI({ container: controlsPanel, title: 'Noise Controls', width: 300 })

    const gridFolder = gui.addFolder('Grid')
    gridFolder.add(state, 'resolution', 4, 150, 1).name('Resolution').onChange(regenerate)
    gridFolder.add(state, 'heightScale', 0, 15, 0.1).name('Height Scale').onChange(regenerate)

    const layersFolder = gui.addFolder('Layers')
    const layerFolders = new Map<string, GUI>()

    function buildLayerFolder(layer: NoiseLayer) {
      const folder = layersFolder.addFolder(layer.name)
      folder.add(layer, 'enabled').name('Enabled').onChange(regenerate)
      folder.add(layer, 'noiseType', NOISE_TYPES).name('Noise Type').onChange(regenerate)
      folder.add(layer, 'frequency', 0.1, 10, 0.01).name('Frequency').onChange(regenerate)
      folder.add(layer, 'offsetX', -10, 10, 0.01).name('Offset X').onChange(regenerate)
      folder.add(layer, 'offsetY', -10, 10, 0.01).name('Offset Y').onChange(regenerate)
      folder.add(layer, 'seed', 0, 999, 1).name('Seed').onChange(regenerate)
      folder.add(layer, 'octaves', 1, 8, 1).name('Octaves (fbm)').onChange(regenerate)
      folder.add(layer, 'persistence', 0, 1, 0.01).name('Persistence (fbm)').onChange(regenerate)
      folder.add(layer, 'lacunarity', 1, 4, 0.01).name('Lacunarity (fbm)').onChange(regenerate)
      folder.add(layer, 'shapingType', SHAPING_TYPES).name('Shaping').onChange(regenerate)
      folder.add(layer, 'shapingAmount', 0, 5, 0.01).name('Shaping Amount').onChange(regenerate)
      folder.add(layer, 'blendMode', BLEND_MODES).name('Blend Mode').onChange(regenerate)
      folder.add(layer, 'amplitude', 0, 1, 0.01).name('Opacity').onChange(regenerate)
      folder.add({ remove: () => removeLayer(layer.id) }, 'remove').name('Remove Layer')
      layerFolders.set(layer.id, folder)
    }

    function addLayer() {
      const layer = createDefaultLayer(state.layers.length === 0)
      state.layers.push(layer)
      buildLayerFolder(layer)
      rebuildPreviewController()
      regenerate()
    }

    function removeLayer(id: string) {
      if (state.layers.length <= 1) return
      const idx = state.layers.findIndex((l) => l.id === id)
      if (idx === -1) return
      state.layers.splice(idx, 1)
      layerFolders.get(id)?.destroy()
      layerFolders.delete(id)
      rebuildPreviewController()
      regenerate()
    }

    layersFolder.add({ addLayer }, 'addLayer').name('+ Add Layer')
    state.layers.forEach(buildLayerFolder)

    let previewController: Controller | null = null
    function rebuildPreviewController() {
      if (previewController) previewController.destroy()
      const options = ['Final Blend', ...state.layers.map((l) => l.name)]
      if (!options.includes(state.previewMode)) state.previewMode = 'Final Blend'
      previewController = gridFolder
        .add(state, 'previewMode', options)
        .name('2D Preview')
        .onChange(regenerate)
    }
    rebuildPreviewController()

    gridFolder
      .add(
        {
          randomize: () => {
            state.layers.forEach((l) => {
              l.seed = Math.floor(Math.random() * 1000)
            })
            layersFolder.controllersRecursive().forEach((c) => c.updateDisplay())
            regenerate()
          },
        },
        'randomize',
      )
      .name('Randomize Seeds')

    const erosionFolder = gui.addFolder('Erosion')
    erosionFolder.add(erosionParams, 'dropletsPerFrame', 1, 300, 1).name('Droplets / Frame')
    erosionFolder.add(erosionParams, 'inertia', 0, 1, 0.01).name('Inertia')
    erosionFolder.add(erosionParams, 'sedimentCapacityFactor', 1, 10, 0.1).name('Capacity Factor')
    erosionFolder.add(erosionParams, 'erodeSpeed', 0, 1, 0.01).name('Erode Speed')
    erosionFolder.add(erosionParams, 'depositSpeed', 0, 1, 0.01).name('Deposit Speed')
    erosionFolder.add(erosionParams, 'evaporateSpeed', 0, 0.2, 0.001).name('Evaporate Speed')
    erosionFolder.add({ reset: resetErosionFromCurrent }, 'reset').name('Reset Erosion')

    regenerate()

    // ---------------------------------------------------------------------
    // render loop
    // ---------------------------------------------------------------------
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      orbitControls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      const w = viewport.clientWidth
      const h = viewport.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      if (erosionAnimId !== null) cancelAnimationFrame(erosionAnimId)
      gui.destroy()
      orbitControls.dispose()
      geometry.dispose()
      solidMaterial.dispose()
      wireMaterial.dispose()
      renderer.dispose()
      viewport.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="noise-app">
      <div className="side-panel">
        <div ref={controlsPanelRef} className="gui-mount" />
        <div className="preview-2d">
          <div className="preview-tabs">
            <button ref={noiseTabBtnRef} type="button" className="tab-btn active">
              Noise Map
            </button>
            <button ref={erosionTabBtnRef} type="button" className="tab-btn">
              Erosion Sim
            </button>
          </div>

          <div ref={noisePanelRef} className="tab-panel">
            <canvas ref={canvas2DRef} className="preview-2d-canvas" />
          </div>

          <div ref={erosionPanelRef} className="tab-panel" hidden>
            <canvas ref={erosionCanvasRef} className="preview-2d-canvas" />
            <div className="erosion-controls">
              <button ref={startBtnRef} type="button" className="sim-btn sim-btn-start">
                Start
              </button>
              <button ref={stopBtnRef} type="button" className="sim-btn sim-btn-stop" disabled>
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
      <div ref={viewportRef} className="viewport-3d" />
    </div>
  )
}

export default NoiseTerrain
