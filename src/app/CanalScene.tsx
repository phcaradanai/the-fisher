import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import type { Rarity } from '../content/types';
import type { TurnCombatEvent, TurnCombatPhase, TurnFishingAction, FishIntentType } from '../game/core/fishing/turn-types';

type CanalSceneProps = {
  description: string;
  errorMessage: string;
  event: TurnCombatEvent | null;
  eventSequence: number;
  fishAction: TurnFishingAction | null;
  fishDistance: number;
  fishIntent: FishIntentType | null;
  fishRarity: Rarity | null;
  phase: TurnCombatPhase;
  bossPhase: 1 | 2 | 3 | null;
  reducedMotion: boolean;
  spotName: string;
  tension: number;
};

const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 680;

export function CanalScene({
  description,
  errorMessage,
  event,
  eventSequence,
  fishAction,
  fishDistance,
  fishIntent,
  fishRarity,
  phase,
  bossPhase,
  reducedMotion,
  spotName,
  tension,
}: CanalSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneState = useRef({
    event,
    eventSequence,
    fishAction,
    fishDistance,
    fishIntent,
    fishRarity,
    phase,
    bossPhase,
    reducedMotion,
    tension,
  });
  const [sceneError, setSceneError] = useState(false);

  useEffect(() => {
    sceneState.current = {
      event,
      eventSequence,
      fishAction,
      fishDistance,
      fishIntent,
      fishRarity,
      phase,
      bossPhase,
      reducedMotion,
      tension,
    };
  }, [event, eventSequence, fishAction, fishDistance, fishIntent, fishRarity, phase, bossPhase, reducedMotion, tension]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    let disposed = false;
    let initialized = false;
    let elapsed = 0;
    let resizeObserver: ResizeObserver | undefined;

    const start = async () => {
      try {
        await app.init({
          antialias: true,
          autoDensity: true,
          backgroundColor: 0x123f43,
          preference: 'webgl',
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          resizeTo: host,
        });
        initialized = true;

        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }

        host.appendChild(app.canvas);
        app.canvas.setAttribute('aria-hidden', 'true');
        app.canvas.setAttribute('role', 'presentation');
        app.canvas.className = 'canal-scene__canvas';

        const world = new Container();
        const sky = new Graphics().rect(0, 0, SCENE_WIDTH, 275).fill({ color: 0xd5c18d });
        const farBank = new Graphics()
          .rect(0, 240, SCENE_WIDTH, 62).fill({ color: 0x586b43 })
          .rect(0, 290, SCENE_WIDTH, 18).fill({ color: 0xb18a50 });
        const water = new Graphics()
          .rect(0, 302, SCENE_WIDTH, SCENE_HEIGHT - 302).fill({ color: 0x15565a })
          .rect(0, 302, SCENE_WIDTH, 7).fill({ color: 0x82a786, alpha: 0.76 })
          .rect(0, 560, SCENE_WIDTH, 120).fill({ color: 0x103b43, alpha: 0.44 })
          .rect(0, 615, SCENE_WIDTH, 65).fill({ color: 0x092f37, alpha: 0.42 });
        const distantHouses = new Graphics()
          .rect(105, 158, 116, 82).fill({ color: 0x9b7951 })
          .moveTo(92, 160).lineTo(163, 104).lineTo(235, 160).fill({ color: 0x674f3d })
          .rect(146, 190, 29, 50).fill({ color: 0x3d5149 })
          .rect(724, 178, 138, 62).fill({ color: 0xc3a766 })
          .moveTo(708, 180).lineTo(790, 126).lineTo(877, 180).fill({ color: 0x735643 })
          .rect(765, 199, 32, 41).fill({ color: 0x435851 });
        const reedLines = new Graphics();
        for (let index = 0; index < 13; index += 1) {
          const x = 35 + index * 38;
          const height = 25 + (index % 4) * 13;
          reedLines.moveTo(x, 300).lineTo(x + 5, 300 - height).stroke({ color: index % 2 ? 0x53693e : 0x77824c, width: 4 });
          reedLines.moveTo(x + 4, 300 - height + 8).lineTo(x + 16, 300 - height - 5).stroke({ color: 0x77824c, width: 2 });
        }
        for (let index = 0; index < 12; index += 1) {
          const x = 910 + index * 28;
          const height = 28 + (index % 3) * 17;
          reedLines.moveTo(x, 300).lineTo(x - 4, 300 - height).stroke({ color: index % 2 ? 0x53693e : 0x77824c, width: 4 });
          reedLines.moveTo(x - 3, 300 - height + 6).lineTo(x - 17, 300 - height - 8).stroke({ color: 0x77824c, width: 2 });
        }
        const bridge = new Graphics()
          .rect(1010, 228, 190, 18).fill({ color: 0x77573b })
          .rect(1030, 246, 11, 78).fill({ color: 0x674d36 })
          .rect(1167, 246, 11, 78).fill({ color: 0x674d36 })
          .rect(1004, 218, 9, 35).fill({ color: 0x674d36 })
          .rect(1195, 218, 9, 35).fill({ color: 0x674d36 });
        const dock = new Graphics()
          .rect(92, 423, 225, 24).fill({ color: 0x9a7142 })
          .rect(104, 447, 14, 112).fill({ color: 0x755737 })
          .rect(282, 447, 14, 112).fill({ color: 0x755737 })
          .rect(93, 432, 224, 3).fill({ color: 0xc49a5a, alpha: 0.8 });
        const line = new Graphics();
        const bobber = new Container();
        const bobberBody = new Graphics()
          .ellipse(0, 0, 13, 28).fill({ color: 0xf07855 })
          .rect(-12, -5, 24, 10).fill({ color: 0xf0d69a })
          .ellipse(0, -24, 5, 6).fill({ color: 0x493d30 });
        bobber.addChild(bobberBody);
        const fish = new Container();
        const fishColor = new Graphics()
          .moveTo(-62, 0).lineTo(-114, -40).lineTo(-108, 0).lineTo(-114, 40).closePath().fill({ color: 0xe4ae61 })
          .ellipse(-7, 0, 68, 36).fill({ color: 0xe4ae61 })
          .moveTo(-12, -30).lineTo(8, -61).lineTo(31, -26).closePath().fill({ color: 0xb57c4a })
          .moveTo(14, 29).lineTo(37, 53).lineTo(45, 26).closePath().fill({ color: 0xb57c4a })
          .ellipse(39, -7, 5, 5).fill({ color: 0x253d39 })
          .ellipse(40, -7, 1.6, 1.6).fill({ color: 0xf0d69a });
        fish.addChild(fishColor);
        const shadow = new Graphics().ellipse(0, 0, 102, 22).fill({ color: 0x082f36, alpha: 0.28 });

        world.addChild(sky, farBank, water, distantHouses, reedLines, bridge, dock, line, bobber, shadow, fish);
        app.stage.addChild(world);

        const ripples = [
          new Graphics().ellipse(0, 0, 46, 7).stroke({ color: 0xb5ceb0, width: 2, alpha: 0.58 }),
          new Graphics().ellipse(0, 0, 29, 5).stroke({ color: 0xd4d6a7, width: 1.5, alpha: 0.66 }),
          new Graphics().ellipse(0, 0, 15, 3).stroke({ color: 0xe4dfb3, width: 1, alpha: 0.52 }),
        ] as const;
        for (const ripple of ripples) world.addChild(ripple);

        const resizeScene = () => {
          const scale = Math.min(app.screen.width / SCENE_WIDTH, app.screen.height / SCENE_HEIGHT);
          world.scale.set(scale);
          world.position.set((app.screen.width - SCENE_WIDTH * scale) / 2, (app.screen.height - SCENE_HEIGHT * scale) / 2);
        };
        resizeObserver = new ResizeObserver(resizeScene);
        resizeObserver.observe(host);
        resizeScene();

        app.ticker.add((ticker) => {
          const state = sceneState.current;
          const motion = state.reducedMotion ? 0 : 1;
          elapsed += ticker.deltaMS * 0.001 * motion;
          const active = state.phase === 'player-turn';
          const floatX = active ? 520 + Math.sin(elapsed * 0.8) * 9 : 500;
          const floatDepth = active && state.fishIntent === 'deep-dive'
            ? 24
            : active && state.fishIntent === 'power-dash'
              ? -14
              : state.phase === 'caught' ? 32 : 0;
          const floatY = 327 + floatDepth + Math.sin(elapsed * (state.event === 'action-brace' ? 5 : 2)) * (active ? 3 : 1);
          bobber.position.set(floatX, floatY);
          bobber.rotation = active ? Math.min(state.tension, 100) * 0.0015 : 0;

          const distance = Math.max(0, Math.min(1, state.fishDistance / 100));
          const fishX = 845 - distance * 400;
          const dash = state.fishIntent === 'power-dash' && active ? Math.sin(elapsed * 10) * 18 : 0;
          const diving = state.fishIntent === 'deep-dive' && active ? 48 : 0;
          const thrashing = state.fishIntent === 'thrash' && active ? Math.sin(elapsed * 12) * 0.15 : 0;
          const actionLift = state.fishAction === 'pull' ? -12 : state.fishAction === 'release' ? 8 : 0;
          const actionTilt = state.fishAction === 'brace' ? -0.05 : state.fishAction === 'observe' ? 0.05 : 0;
          const size = state.fishRarity === 'king' ? 1.28 : state.fishRarity === 'rare' ? 1.12 : 0.9;
          const eventPulse = active && state.eventSequence % 2 === 0 ? 1.04 : 1;
          fish.position.set(fishX + dash, 518 + diving + actionLift + Math.sin(elapsed * 1.8) * 5);
          fish.rotation = thrashing + actionTilt;
          fish.scale.set(size * eventPulse, (state.fishRarity === 'king' ? 1.28 : 0.9) * eventPulse);
          fish.visible = active || state.phase === 'caught';
          shadow.visible = fish.visible;
          shadow.position.set(fishX + dash, 557 + diving * 0.25);
          if (state.fishRarity === 'king') fishColor.tint = state.bossPhase === 3 ? 0xf07855 : 0xd7c78d;
          else if (state.fishRarity === 'rare') fishColor.tint = 0xc3cf85;
          else fishColor.tint = 0xffffff;

          line.visible = active || state.phase === 'caught';
          line.clear()
            .moveTo(293, 425)
            .bezierCurveTo(355, 351, 416, 343 + state.tension * 0.45, floatX, floatY - 24)
            .stroke({ color: state.tension > 70 ? 0xf07855 : 0xe8dfbd, width: 2.5, alpha: 0.94 });

          const rippleX = active ? floatX : 500;
          for (const ripple of ripples) ripple.position.set(rippleX, 356);
          const rippleScale = state.reducedMotion ? 1 : 0.74 + ((Math.sin(elapsed * 1.2) + 1) / 2) * 0.48;
          ripples[0].scale.set(rippleScale);
          ripples[1].scale.set(rippleScale * 0.88);
          ripples[2].scale.set(rippleScale * 0.78);
        });
      } catch {
        if (!disposed) setSceneError(true);
      }
    };

    void start();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (initialized) app.destroy(true, { children: true });
    };
  }, []);

  return (
    <figure className="canal-scene" aria-label={`${spotName}. ${description}`}>
      <div className="canal-scene__canvas-host" ref={hostRef} aria-hidden="true" />
      {sceneError && <p className="canal-scene__error" role="status">{errorMessage}</p>}
      <figcaption className="visually-hidden">{description}</figcaption>
    </figure>
  );
}
