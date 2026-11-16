import { useEffect, useMemo, useRef, useState } from "react";
import type { ResourceKey } from "../data/types";
import { useGame } from "../state/game";
import { currentResult, useMission } from "../state/mission";
import { toMs } from "../state/time";
import { useUi } from "../state/ui";
import type { PlannedEvent, StageId } from "../sim";
import { BAR_ICON } from "./Builder";
import { Icon } from "./icons";
import { Btn, Tip } from "./kit";
import { Flip } from "./LaunchPrep";
import { OpsGlobe, makeOpsView, type OpsEffect } from "./OpsGlobe";
import { emit } from "../tutorial/bus";
import { tourHooks } from "../tutorial/hooks";
import { sfx } from "./sound";

const STAGE_ICON: Record<StageId, keyof typeof Icon> = {
  instruments: "camera",
  storage: "data",
  radio: "comms",
  ground: "dish",
};
const fmt = (n: number) =>
  n >= 10000
    ? `${(n / 1000).toFixed(1)}k`
    : Math.round(n).toLocaleString("en-US");
const CONFETTI = ["#fcc840", "#63bf4f", "#4ba4e3", "#e9523b", "#fff1d6"];

/** What each event looks like on the globe. */
const FX_KIND: Record<string, NonNullable<OpsEffect>["kind"]> = {
  solarStorm: "storm",
  stationRain: "rain",
  wildfire: "fire",
  coldBattery: "cold",
  wobblyWheel: "wobble",
  debrisAlert: "debris",
  bonusRequest: "bonus",
};

/**
 * A decision, in a compact panel in the corner: the event itself is on the
 * globe. One sentence, two buttons named after what they do, each with its
 * costs as chips, and the real-world basis as one small line.
 */
function EventPanel({
  event,
  onChoose,
}: {
  event: PlannedEvent;
  onChoose: (c: "a" | "b") => void;
}) {
  return (
    <div
      className="op-event"
      data-ui="event"
      role="dialog"
      aria-label={event.title}
    >
      <header>
        <span className="op-event-icon">
          <Icon.alert />
        </span>
        <b>{event.title}</b>
        <small>Day {event.day} · your call</small>
      </header>
      <p className="op-event-text">{event.text}</p>
      <div className="op-event-sides">
        {event.choices.map((c, i) => (
          <div key={c.id} className="op-event-side">
            <Tip text={c.blurb}>
              <Btn
                tone={i === 0 ? "blue" : "yellow"}
                block
                sound={null}
                ui={`event.choose.${i === 0 ? "a" : "b"}`}
                onClick={() => {
                  sfx("snap");
                  onChoose(i === 0 ? "a" : "b");
                }}
              >
                {c.label}
              </Btn>
            </Tip>
            <div className="chips">
              {c.previews.length === 0 && (
                <span className="chip">No change</span>
              )}
              {c.previews.map((pv, j) => {
                const BI = Icon[BAR_ICON[pv.bar as ResourceKey]];
                return (
                  <span
                    key={j}
                    className={`chip ${pv.delta < 0 ? "bad" : "good"}`}
                  >
                    <BI /> {pv.text}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <small className="op-event-basis">{event.basis}</small>
    </div>
  );
}

/**
 * Mission operations. The globe is the star: photos pop off the satellite over
 * its target, wait in storage, and stream down the beam over a dish; what does
 * not fit spills away as lost. Beside it, three meters and the data pipeline;
 * below it, the mission's days with a playhead.
 */
export function Ops() {
  const plan = useMission((s) => s.plan)!;
  const choices = useMission((s) => s.choices);
  const flightQuality = useMission((s) => s.flightQuality);
  const setMission = useMission((s) => s.set);
  const draft = useGame((s) => s.draft);
  const setScreen = useUi((s) => s.setScreen);
  const nDays = plan.evaluation.contract.missionDays;
  // the whole time-lapse takes about 40 design-seconds, whatever the mission length
  const dayMs = useMemo(
    () => toMs(Math.min(5.5, Math.max(2.4, 40 / nDays))),
    [nDays],
  );
  const view = useRef(makeOpsView()).current;
  const [day, setDay] = useState(0); // completed days
  const [card, setCard] = useState<PlannedEvent | null>(null);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [party, setParty] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => currentResult()!, [choices, flightQuality]);
  const answered = useRef(new Set<string>());
  const live = useRef({
    speed: 1,
    running: true,
    card: false,
    cardFrom: 0,
    fxUntil: 0,
    fxUntilDay: -1,
  });
  live.current.speed = speed;
  live.current.card = !!card;

  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const timeBar = useRef<HTMLElement>(null);
  const satEl = useRef<HTMLDivElement>(null);
  const tankFill = useRef<HTMLElement>(null);
  const battFill = useRef<HTMLElement>(null);
  const battBar = useRef<HTMLElement>(null);
  const battNote = useRef<HTMLSpanElement>(null);
  const storeBar = useRef<HTMLElement>(null);
  const storeMeter = useRef<HTMLDivElement>(null);
  const playhead = useRef<HTMLElement>(null);
  const linkLamp = useRef<HTMLSpanElement>(null);
  const reticle = useRef<HTMLElement>(null);

  // ---- what the rules engine says each day made and brought home, as photo tiles for the globe
  const p = result.evaluation.pipeline;
  const tileMb = Math.max(1, p.madeIdealPerDay / 8);
  const capacity = p.losing
    ? Math.max(1, Math.round(p.deliveredPerDay / tileMb))
    : 9;
  const radio = p.stages.find((s) => s.id === "radio")?.mbPerDay ?? 0;
  const power = result.evaluation.power;
  view.nDays = nDays;
  view.quota = (i) => {
    const d = result.days[i];
    if (!d) return { make: 0, keep: 0 };
    const make = Math.round(d.madeMb / tileMb);
    return { make, keep: Math.min(make, Math.round(d.deliveredMb / tileMb)) };
  };
  view.beam = Math.min(
    1,
    Math.max(0.08, (Math.log10(Math.max(10, radio)) - 1.9) / 1.6),
  );
  view.depth = Math.min(
    1.05,
    power.minBatteryWh / Math.max(0.01, power.batteryWh),
  );

  useEffect(() => {
    // handy for screenshots and debugging, like the other handles in main.tsx
    Object.assign(window, { __ops: view });
    let raf = 0;
    let last = performance.now();
    const seen = { pops: 0, spills: 0, shadow: false, contact: "" };
    const drop = (cls: string) => {
      const host = satEl.current;
      if (!host) return;
      const el = document.createElement("i");
      el.className = cls;
      host.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
      // (never let these pile up if the tab was asleep)
      if (host.childElementCount > 24)
        host.querySelector("i.pop, i.spill")?.remove();
    };
    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const L = live.current;
      // while Rocco is explaining the screen, the days wait for him
      // (`__opsHold` lets a screenshot script stop the clock on a moment)
      const waiting =
        !!tourHooks.opsPaused?.() ||
        !!(window as unknown as { __opsHold?: boolean }).__opsHold;
      view.speed = waiting || !L.running ? 0 : L.card ? 0.03 : L.speed;
      if (L.card && !waiting) {
        // a decision is open: time slows to a crawl
        view.days = Math.min(
          L.cardFrom + 0.16,
          view.days + (dt / dayMs) * 0.03,
        );
      } else if (view.effect) {
        // the choice plays out on the globe, then the event is over
        if (L.fxUntilDay >= 0 ? view.days >= L.fxUntilDay : now >= L.fxUntil) {
          view.effect = null;
          view.sweep = false;
          L.fxUntilDay = -1;
        }
      }
      if (L.running && !L.card && !waiting) {
        view.days = Math.min(nDays, view.days + (dt / dayMs) * L.speed);
        const whole = Math.floor(view.days + 1e-6);
        // a decision card comes up at the start of its day
        const due = plan.events.find(
          (e) => !answered.current.has(e.id) && view.days >= e.day - 1,
        );
        if (due) {
          view.days = due.day - 1;
          L.card = true;
          L.cardFrom = due.day - 1;
          view.effect = {
            kind: FX_KIND[due.id] ?? "debris",
            station: draft?.stationIds[0],
          };
          view.focus = true;
          view.sweep = false;
          L.fxUntilDay = -1;
          setDay(due.day - 1);
          setCard(due);
          sfx("pop");
          emit("event.shown");
        } else {
          setDay((d) => {
            if (whole !== d) sfx("tick");
            return whole;
          });
          if (view.days >= nDays) {
            L.running = false;
            setDone(true);
            sfx("success");
            emit("mission.done");
          }
        }
      }

      // ---- mirror the globe into the gauges
      const host = root.current;
      if (host) {
        const w = host.clientWidth;
        const h = host.clientHeight;
        view.insetRight = panel.current ? w - panel.current.offsetLeft : 0;
        view.insetBottom = timeBar.current ? h - timeBar.current.offsetTop : 0;
        if (satEl.current) {
          satEl.current.style.transform = `translate(${(view.satX * w).toFixed(1)}px, ${(view.satY * h).toFixed(1)}px)`;
          satEl.current.classList.toggle("hidden", !view.satShown);
          satEl.current.classList.toggle("dark", view.shadow);
          satEl.current.classList.toggle("safe", view.days < view.safeUntil);
        }
        if (reticle.current)
          reticle.current.style.transform = `translate(${(view.fxX * w).toFixed(1)}px, ${(view.fxY * h).toFixed(1)}px)`;
      }
      const full = Math.min(1, view.held / capacity);
      if (tankFill.current) tankFill.current.style.height = `${full * 100}%`;
      if (storeBar.current) storeBar.current.style.width = `${full * 100}%`;
      if (battFill.current)
        battFill.current.style.width = `${view.battery * 100}%`;
      if (battBar.current) {
        battBar.current.style.width = `${view.battery * 100}%`;
        battBar.current.classList.toggle("low", view.battery < 0.25);
      }
      if (view.shadow !== seen.shadow && battNote.current) {
        seen.shadow = view.shadow;
        battNote.current.textContent = view.shadow
          ? "On battery in Earth's shadow"
          : "Charging in sunlight";
      }
      if ((view.contact ?? "") !== seen.contact && linkLamp.current) {
        seen.contact = view.contact ?? "";
        linkLamp.current.classList.toggle("on", !!view.contact);
      }
      while (seen.pops < view.pops) {
        seen.pops++;
        drop("pop");
      }
      while (seen.spills < view.spills) {
        seen.spills++;
        drop("spill");
        storeMeter.current?.classList.remove("flash");
        void storeMeter.current?.offsetWidth;
        storeMeter.current?.classList.add("flash");
      }
      if (playhead.current)
        playhead.current.style.left = `${(view.days / nDays) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayMs, nDays, capacity]);

  const choose = (c: "a" | "b") => {
    if (!card) return;
    answered.current.add(card.id);
    // the choice plays out where it happened
    const fx = card.choices[c === "a" ? 0 : 1].effect;
    const from = card.day - 1;
    const L = live.current;
    view.focus = false;
    if (fx.dataDaysLost) view.safeUntil = from + fx.dataDaysLost;
    if (fx.wipeStorage) {
      view.held = 0;
      view.hit++;
    }
    if (fx.cost && card.id === "stationRain") {
      // a rented dish lights up and takes over
      view.backup = true;
      view.effect = null;
    } else if (fx.downlinkDaysLost) {
      L.fxUntilDay = from + fx.downlinkDaysLost;
    } else {
      view.sweep = true;
      L.fxUntil = performance.now() + 2600;
      if (
        !fx.dataDaysLost &&
        !fx.wipeStorage &&
        !fx.scienceMult &&
        (fx.lifetimeMult ?? 1) < 1
      )
        view.hit++;
    }
    setMission({ choices: { ...choices, [card.id]: c } });
    setCard(null);
  };
  const skip = () => {
    const next = plan.events.find((e) => !answered.current.has(e.id));
    view.days = next ? next.day - 1 : nDays;
  };

  const logs = result.days.slice(0, day);
  const made = logs.reduce((n, d) => n + d.madeMb, 0);
  const home = logs.reduce((n, d) => n + d.deliveredMb, 0);
  const lost = Math.max(0, made - home);
  const science = logs.length ? logs[logs.length - 1].scienceTotal : 0;
  const today = result.days[Math.min(day, nDays - 1)];
  const target = result.science.target;
  const reached = science >= target;
  useEffect(() => {
    if (!reached) return;
    setParty(true);
    sfx("chime");
    const t = setTimeout(() => setParty(false), 3200);
    return () => clearTimeout(t);
  }, [reached]);
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: (i * 37) % 100,
        color: CONFETTI[i % CONFETTI.length],
        delay: (i % 9) * 0.07,
        dur: 1.5 + (i % 5) * 0.22,
        wide: i % 3 === 0,
        turn: 300 + ((i * 53) % 420),
      })),
    [],
  );

  const passes = Math.min(
    12,
    result.evaluation.links.reduce((n, l) => n + l.passesPerDay, 0),
  );
  const dayShown = Math.min(nDays, day + (done ? 0 : 1));
  // the target sits four fifths of the way along the science bar, so going past it shows
  const sciShare = Math.min(1, (science / target) * 0.8);

  return (
    <div className="flow op" data-ui="ops" ref={root}>
      <div className="op-sky">
        <OpsGlobe
          orbitId={draft?.orbitId ?? "leo"}
          stationIds={draft?.stationIds ?? ["home"]}
          contractId={result.evaluation.contract.id}
          view={view}
        />
      </div>
      <div className="op-globe" data-ui="ops.globe" aria-hidden />

      {/* drawn beside the satellite: the photos it holds, and its battery */}
      <div className="op-sat" ref={satEl} aria-hidden>
        <span className="op-tank">
          <i ref={tankFill} />
        </span>
        <span className="op-cell">
          <i ref={battFill} />
        </span>
        <b className="op-safe">Resting</b>
      </div>
      {card && <i className="op-reticle" ref={reticle} aria-hidden />}

      <header className="op-head">
        <span className="op-name">
          <i className={`lamp${done ? " green" : " live"}`} aria-hidden />{" "}
          {result.evaluation.contract.title}
        </span>
        <span className="op-daycount" data-ui="ops.day">
          Day{" "}
          <Flip text={String(dayShown).padStart(2, "0")} className="small" /> of{" "}
          {nDays}
        </span>
        <span className="op-link" ref={linkLamp}>
          <Icon.dish /> Downlink
        </span>
      </header>

      <aside className="op-panel" ref={panel}>
        <Tip
          below
          text={`${fmt(science)} of ${fmt(target)} science. Made ${fmt(made)} MB, home ${fmt(home)} MB, lost ${fmt(lost)} MB.`}
        >
          <div
            className={`op-meter sci${reached ? " done" : ""}`}
            data-ui="ops.science"
          >
            <span className="op-meter-top">
              <span className="op-meter-name">
                <Icon.star /> Science
              </span>
              <span className="op-meter-note">
                {reached
                  ? `Target reached: ${Math.round((science / target) * 100)}%`
                  : `${Math.round((science / target) * 100)}% of the target`}
              </span>
            </span>
            <span className="op-bar">
              <i style={{ width: `${sciShare * 100}%` }} />
              <b className="goal" />
            </span>
          </div>
        </Tip>
        <Tip
          below
          text={`One pass through Earth's shadow uses about ${Math.round(Math.min(1, view.depth) * 100)}% of the battery.`}
        >
          <div className="op-meter batt" data-ui="ops.battery">
            <span className="op-meter-top">
              <span className="op-meter-name">
                {(() => {
                  const BI = Icon[BAR_ICON.power];
                  return <BI />;
                })()}{" "}
                Battery
              </span>
              <span className="op-meter-note" ref={battNote}>
                Charging in sunlight
              </span>
            </span>
            <span className="op-bar">
              <i ref={battBar} style={{ width: "100%" }} />
            </span>
          </div>
        </Tip>
        <Tip
          below
          text={
            p.losing
              ? `Storage holds what the next passes can carry: ${fmt(p.deliveredPerDay)} MB a day. The rest is overwritten.`
              : `Everything the camera makes fits: ${fmt(p.madePerDay)} MB a day.`
          }
        >
          <div
            className={`op-meter store${lost > 0 ? " losing" : ""}`}
            ref={storeMeter}
            data-ui="ops.storage"
          >
            <span className="op-meter-top">
              <span className="op-meter-name">
                <Icon.data /> Storage
              </span>
              <span className="op-meter-note">
                {lost > 0 ? `Full: ${fmt(lost)} MB lost` : "Waiting for a pass"}
              </span>
            </span>
            <span className="op-bar">
              <i ref={storeBar} style={{ width: "0%" }} />
            </span>
          </div>
        </Tip>

        <div className="op-pipe" data-ui="ops.pipeline">
          <div className="op-flow">
            {p.stages.map((s, i) => {
              const SI = Icon[STAGE_ICON[s.id]];
              const slow = today && today.bottleneck === s.id && p.losing;
              return (
                <Tip
                  key={s.id}
                  text={`${s.label}: ${fmt(s.mbPerDay)} MB a day. ${s.detail}`}
                  className={`op-node${slow ? " slow" : ""}`}
                >
                  <SI />
                  {i < p.stages.length - 1 && (
                    <i className="wire" aria-hidden />
                  )}
                </Tip>
              );
            })}
          </div>
          <p className="op-pipe-note">
            {p.losing
              ? `The slowest link sets the pace: ${fmt(p.deliveredPerDay)} of ${fmt(p.madeIdealPerDay)} MB a day reaches the ground.`
              : "Every link keeps up: all the data reaches the ground."}
          </p>
        </div>
        {!done && (
          <ul className="op-key" aria-label="On the globe">
            <li>
              <i /> A photo, taken over the glowing target
            </li>
            <li>
              <i className="beam" /> The beam to a dish: photos go home
            </li>
            <li>
              <i className="lost" /> Storage was full: the photo is lost
            </li>
          </ul>
        )}

        {done && (
          <Btn
            block
            size="lg"
            sound="success"
            ui="ops.debrief"
            onClick={() => setScreen("debrief")}
          >
            Mission complete: debrief
          </Btn>
        )}
      </aside>

      <footer className="op-time" ref={timeBar}>
        <div className="op-days" data-ui="ops.timeline">
          {Array.from({ length: nDays }, (_, i) => {
            const ev = plan.events.find((e) => e.day === i + 1);
            return (
              <span
                key={i}
                className={`op-day${i < day ? " past" : ""}${i === day && !done ? " now" : ""}`}
              >
                <b>{i + 1}</b>
                <i
                  className="passes"
                  style={{
                    backgroundSize: `${100 / Math.max(1, passes)}% 100%`,
                  }}
                  aria-hidden
                />
                {ev && (
                  <span
                    className={`op-ev${answered.current.has(ev.id) ? " done" : ""}`}
                  >
                    {answered.current.has(ev.id) ? (
                      <Icon.check />
                    ) : (
                      <Icon.alert />
                    )}
                  </span>
                )}
              </span>
            );
          })}
          <i className="op-playhead" ref={playhead} aria-hidden />
        </div>
        <div className="op-speed" role="group" aria-label="Speed">
          <button
            type="button"
            className={speed === 1 ? "on" : ""}
            disabled={done}
            data-ui="ops.speed.1"
            onClick={() => setSpeed(1)}
          >
            1×
          </button>
          <button
            type="button"
            className={speed === 4 ? "on" : ""}
            disabled={done}
            data-ui="ops.speed.4"
            onClick={() => setSpeed(4)}
          >
            4×
          </button>
          <button
            type="button"
            disabled={done || !!card}
            data-ui="ops.skip"
            onClick={skip}
          >
            <Icon.fast /> Skip to end
          </button>
        </div>
      </footer>

      {party && (
        <div className="op-party" aria-live="polite">
          <div className="confetti" aria-hidden>
            {bits.map((b, i) => (
              <i
                key={i}
                className={b.wide ? "wide" : ""}
                style={{
                  left: `${b.left}%`,
                  background: b.color,
                  animationDelay: `${b.delay}s`,
                  animationDuration: `${b.dur}s`,
                  ["--turn" as string]: `${b.turn}deg`,
                }}
              />
            ))}
          </div>
          <b>Target reached!</b>
        </div>
      )}
      {card && <EventPanel event={card} onChoose={choose} />}
    </div>
  );
}
