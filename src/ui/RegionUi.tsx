import { useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { palette } from '../art/palette'
import { MATERIAL_BY_ID, REGIONS, REGION_IDS, REGION_STATE_WORDS, type RegionId } from '../data/regions'
import { Model } from '../scene/Model'
import { Pin } from '../scene/pins'
import { regionTint } from '../scene/regionTint'
import { terrainHeightUv } from '../scene/relief'
import { uvToWorld } from '../scene/world'
import { useGame } from '../state/game'
import { usePlacement } from '../state/placement'
import { focusRegion, missingMaterials, startClearing, startRestoring } from '../state/regions'
import { useUi } from '../state/ui'
import { Icon, type IconName } from './icons'
import { Btn, LockBadge, PayBtn, Ring, TimerRow, Win, formatTime, useNow } from './kit'
import { marketStart } from './MarketSheet'
import { Thumb } from './thumbs'
import { RoccoSays } from './Rocco'
import { sfx } from './sound'

/**
 * Everything the player sees and taps for the lost regions: the floating
 * badges over the signposts and ruins, the card that opens from them (teaser
 * picture, what it takes, what it gives back), and Rocco's lines about them.
 */

export const REGION_ICON: Record<RegionId, IconName> = { tracking: 'dish', annex: 'flask', heavy: 'rocket' }

function open(id: RegionId) {
  sfx('pop')
  focusRegion(id)
  useUi.getState().openRegion(id)
}

/** Countdown for a badge: the ring fills as the work goes on. */
function Countdown({ start, end, icon }: { start?: number; end: number; icon: React.ReactNode }) {
  const now = useNow(250)
  const k = start ? (now - start) / Math.max(1, end - start) : 0.5
  return (
    <>
      <Ring p={k}>{icon}</Ring>
      <span>{formatTime(end - now)}</span>
    </>
  )
}

/** The floating badges: padlock and level over a locked ruin (only while the pointer is on it), "!" when it can be explored, timers and "Restore" over the site. */
export function RegionPins() {
  const regions = useGame((s) => s.regions)
  const tour = useGame((s) => s.tourStep)
  const placing = usePlacement((s) => s.id)
  const sheet = useUi((s) => s.sheet)
  const card = useUi((s) => s.regionCard)
  const hover = useUi((s) => s.hoverRegion)
  if (tour >= 0 || placing || sheet) return null
  return (
    <>
      {REGION_IDS.map((id) => {
        const def = REGIONS[id]
        const rec = regions[id]
        if (rec.state === 'active' || card === id) return null
        const shown = hover === id
        // "Explore" sits on the signpost; a locked region's level floats over its ruin, where the pointer is
        const atSign = rec.state === 'available'
        const [u, v] = atSign ? def.sign : def.site
        const [x, z] = uvToWorld(u, v)
        const y = atSign ? terrainHeightUv(u, v) + 3.7 : terrainHeightUv(u, v) + def.height * 0.45 + 0.8
        return (
          <Pin key={id} at={[x, y, z]}>
            {rec.state === 'locked' && (
              <div className={`wbadge locked${shown ? ' shown' : ''}`} role="tooltip" aria-hidden={!shown}>
                <Icon.lock />
                <span>Level</span>
                <b>{def.needsLevel}</b>
              </div>
            )}
            {rec.state === 'available' && (
              <button type="button" className="wbadge ready" data-ui={`world.region.${id}`} onClick={() => open(id)} aria-label={`${def.name}: ready to explore`}>
                <i>!</i>
                <span>Explore</span>
              </button>
            )}
            {rec.state === 'ruins' && (
              <button type="button" className="wbadge act" data-ui={`world.region.${id}`} onClick={() => open(id)} aria-label={`Restore the ${def.name}`}>
                <Icon.wrench />
                <span>Restore</span>
              </button>
            )}
            {(rec.state === 'clearing' || rec.state === 'restoring') && rec.end && (
              <button type="button" className="wbadge timer" data-ui={`world.region.${id}`} onClick={() => open(id)} aria-label={`${def.name}: work in progress`}>
                <Countdown start={rec.start} end={rec.end} icon={rec.state === 'clearing' ? <Icon.hammer /> : <Icon.wrench />} />
              </button>
            )}
          </Pin>
        )
      })}
    </>
  )
}

// ------------------------------------------------------------------ the teaser picture
const TEASER_CAM: Record<RegionId, { dist: number; look: number; lift: number }> = {
  tracking: { dist: 21, look: 3.4, lift: 0.52 },
  annex: { dist: 19, look: 2.4, lift: 0.5 },
  heavy: { dist: 27, look: 3.2, lift: 0.5 },
}

function TeaserStage({ id, restored }: { id: RegionId; restored: boolean }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const cam = TEASER_CAM[id]
  // this little scene shares its materials with the island: keep the island's region tint out of it
  useEffect(() => {
    scene.onBeforeRender = () => {
      regionTint.uRegionOn.value = 0
    }
  }, [scene])
  useFrame((state) => {
    const a = 0.75 + Math.sin(state.clock.elapsedTime * 0.25) * 0.35
    camera.position.set(Math.sin(a) * cam.dist, cam.dist * cam.lift, Math.cos(a) * cam.dist)
    camera.lookAt(0, cam.look, 0)
  })
  return (
    <>
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, 1.3]} />
      <directionalLight color={palette.sun} intensity={2.3} position={[-5, 9, 7]} />
      <directionalLight color={palette.hemiSky} intensity={0.5} position={[6, 3, -4]} />
      <Model model={REGIONS[id].model} options={{ level: restored ? 1 : 0 }} />
      {/* the ground it stands on */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[id === 'heavy' ? 8.5 : 6.2, 40]} />
        <meshStandardMaterial color={restored ? palette.grass : palette.grassShade} roughness={1} />
      </mesh>
    </>
  )
}

/** A live picture of the landmark: the overgrown ruin, or the restored building once it stands. */
function Teaser({ id, restored, veiled }: { id: RegionId; restored: boolean; veiled: boolean }) {
  return (
    <div className={`region-teaser${veiled ? ' veiled' : ''}`}>
      <i className="tape l" aria-hidden />
      <i className="tape r" aria-hidden />
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} camera={{ fov: 26, position: [12, 10, 14], near: 1, far: 90 }}>
        <TeaserStage id={id} restored={restored} />
      </Canvas>
      {veiled && <div className="mist" aria-hidden />}
    </div>
  )
}

// ------------------------------------------------------------------ the card
function WhyBox({ id }: { id: RegionId }) {
  const why = REGIONS[id].why
  const [shown, setShown] = useState(false)
  if (!why) return null
  return (
    <div className="card region-why">
      <button type="button" className="why-btn wide" data-ui={`region.${id}.why`} aria-expanded={shown} onClick={() => setShown(!shown)}>
        <Icon.question /> <b>{why.title}</b>
      </button>
      {shown && (
        <>
          <p className="t-body rule">{why.rule}</p>
          <p className="t-body">{why.basis}</p>
          <small className="t-small">{why.source}</small>
        </>
      )}
    </div>
  )
}

/** A lost region's card: a weathered expedition map with a picture of the ruin, what it takes, and what it gives back. */
export function RegionCard() {
  const id = useUi((s) => s.regionCard)
  const close = () => useUi.getState().openRegion(null)
  const regions = useGame((s) => s.regions)
  const level = useGame((s) => s.level)
  const coins = useGame((s) => s.coins)
  const inventory = useGame((s) => s.inventory)
  const toast = useUi((s) => s.toast)
  if (!id) return null
  const def = REGIONS[id]
  const rec = regions[id]
  const I = Icon[REGION_ICON[id]]
  const missing = missingMaterials(id, inventory)
  const run = (fn: () => string | null) => {
    const err = fn()
    if (err) {
      sfx('error')
      toast(err, 'bad')
    }
  }

  let foot: React.ReactNode = undefined
  if (rec.state === 'locked') {
    foot = (
      <Btn disabled ui={`region.${id}.locked`}>
        <Icon.lock /> Reach agency level {def.needsLevel}
      </Btn>
    )
  } else if (rec.state === 'available') {
    foot = (
      <PayBtn tone="green" price={def.clearCost} ui={`region.${id}.clear`} onPay={() => run(() => startClearing(id))}>
        Clear the way
      </PayBtn>
    )
  } else if (rec.state === 'ruins') {
    foot = (
      <>
        {missing.length > 0 && (
          <Btn
            tone="blue"
            className="fit"
            ui={`region.${id}.materials`}
            onClick={() => {
              marketStart.tab = 'material'
              useUi.getState().open({ kind: 'market' })
            }}
          >
            <Icon.market /> Materials
          </Btn>
        )}
        <PayBtn tone="green" price={def.restoreCost} disabled={missing.length > 0} ui={`region.${id}.restore`} onPay={() => run(() => startRestoring(id))}>
          Restore
        </PayBtn>
      </>
    )
  }

  return (
    <Win id={`region.${id}`} title={def.name} subtitle={`${REGION_STATE_WORDS[rec.state]} · ${def.place}`} icon={<I />} onClose={close} clearScrim coins variant="side" theme="map" foot={foot}>
      <div className="region-card">
        <div className="map-top">
          <Teaser id={id} restored={rec.state === 'active'} veiled={rec.state === 'locked' || rec.state === 'available'} />
          <span className={`stamp map-stamp ${rec.state === 'active' ? 'go' : rec.state === 'locked' ? '' : 'amber'}`}>{REGION_STATE_WORDS[rec.state]}</span>
        </div>
        <small className="t-small place">
          <Icon.map /> {def.place}
        </small>
        <p className="t-body">{rec.state === 'active' ? def.memory : def.teaser}</p>

        <div className="card lrow region-reward">
          <Thumb model={`region:${id}:1`} icon={REGION_ICON[id]} tint="#ffe69a" />
          <div className="grow">
            <small className="t-small">{rec.state === 'active' ? 'Working again' : 'Restore it to unlock'}</small>
            <b className="t-label">{def.reward}</b>
            <small className="t-small">{def.rewardDetail}</small>
          </div>
        </div>

        {rec.state === 'locked' && (
          <div className="chips needs">
            <LockBadge level={def.needsLevel} text="Needs agency level" />
            <span className="chip">You are level {level}</span>
          </div>
        )}
        {rec.state === 'available' && (
          <div className="chips needs">
            <span className="chip good">
              <Icon.check /> Level {def.needsLevel} reached
            </span>
            <span className="chip">
              <Icon.crew /> {def.crew} crew go in
            </span>
            <span className="chip blue">
              <Icon.clock /> {def.clearSeconds}s to clear
            </span>
          </div>
        )}
        {rec.state === 'clearing' && rec.start && rec.end && <TimerRow label="The crew is clearing a way in" start={rec.start} end={rec.end} icon={<Icon.hammer />} />}
        {rec.state === 'ruins' && (
          <>
            <p className="eyebrow">What the restoration needs</p>
            <div className="mat-list">
              {def.materials.map((m) => {
                const have = inventory[m.id] ?? 0
                const ok = have >= m.qty
                return (
                  <span key={m.id} className={`mat${ok ? ' ok' : ''}`}>
                    <Thumb model={`material:${m.id}`} icon="hammer" size="sm" />
                    <b className="t-num">
                      {Math.min(have, m.qty)}/{m.qty}
                    </b>
                    <small className="t-small">{MATERIAL_BY_ID[m.id].name}</small>
                    {ok && <Icon.check className="tick" />}
                  </span>
                )
              })}
            </div>
            <div className="chips needs">
              <span className="chip blue">
                <Icon.clock /> {def.restoreSeconds}s to rebuild
              </span>
              {coins < def.restoreCost && <span className="chip bad">Short of coins</span>}
            </div>
            {missing.length > 0 && <small className="t-small">Cable spools, steel beams and control panels are sold at the Parts Market, under Materials.</small>}
          </>
        )}
        {rec.state === 'restoring' && rec.start && rec.end && <TimerRow label="Scaffolding is up: restoring" start={rec.start} end={rec.end} icon={<Icon.wrench />} />}
        <WhyBox id={id} />
      </div>
    </Win>
  )
}

/** Chief Rocco's lines about the regions: "we can go and get her now", and his memory of each place. */
export function RoccoLines() {
  const line = useUi((s) => s.lines[0])
  const next = useUi((s) => s.nextLine)
  const lineId = line?.id
  useEffect(() => {
    if (!line) return
    sfx('pop')
    if (line.region) focusRegion(line.region, 0.12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId])
  if (!line) return null
  return <RoccoSays key={line.id} text={line.text} mood={line.mood} onNext={next} />
}
