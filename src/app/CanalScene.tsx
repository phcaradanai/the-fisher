import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import type { FishingPhase } from '../game/core/fishing/types';
import type { Rarity } from '../content/types';

type CanalSceneProps = {
  description: string;
  errorMessage: string;
  fishDirection: -1 | 1;
  fishDistance: number;
  fishRarity: Rarity | null;
  phase: FishingPhase;
  reducedMotion: boolean;
  spotName: string;
  tension: number;
};

const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 680;

export function CanalScene({
  description,
  errorMessage,
  fishDistance,
  fishDirection,
  fishRarity,
  phase,
  reducedMotion,
  spotName,
  tension,
}: CanalSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneState = useRef({ fishDirection, fishDistance, fishRarity, phase, reducedMotion, tension });
  const [sceneError, setSceneError] = useState(false);

  useEffect(() => {
    sceneState.current = { fishDirection, fishDistance, fishRarity, phase, reducedMotion, tension };
  }, [fishDirection, fishDistance, fishRarity, phase, reducedMotion, tension]);

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
          .rect(0, 560, SCENE_WIDTH, 120).fill({ color: 0x103b43, alpha: 0.44 });
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
          .ellipse(0, 0, 12, 24).fill({ color: 0xf07855 })
          .rect(-11, -4, 22, 8).fill({ color: 0xf0d69a })
          .ellipse(0, -20, 4, 5).fill({ color: 0x493d30 });
        bobber.addChild(bobberBody);
        const fish = new Container();
        const fishColor = new Graphics()
          .moveTo(-46, 0).lineTo(-78, -25).lineTo(-78, 25).closePath().fill({ color: 0xe4ae61 })
          .ellipse(-8, 0, 44, 22).fill({ color: 0xe4ae61 })
          .moveTo(-10, -18).lineTo(8, -38).lineTo(22, -15).closePath().fill({ color: 0xb57c4a })
          .ellipse(22, -5, 3, 3).fill({ color: 0x253d39 });
        fish.addChild(fishColor);

        world.addChild(sky, farBank, water, distantHouses, reedLines, bridge, dock, line, bobber, fish);
        app.stage.addChild(world);

        const ripples = [
          new Graphics().ellipse(0, 0, 38, 5).stroke({ color: 0xb5ceb0, width: 2, alpha: 0.58 }),
          new Graphics().ellipse(0, 0, 23, 4).stroke({ color: 0xd4d6a7, width: 1.5, alpha: 0.66 }),
          new Graphics().ellipse(0, 0, 12, 3).stroke({ color: 0xe4dfb3, width: 1, alpha: 0.52 }),
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
          const active = state.phase === 'waiting' || state.phase === 'bite' || state.phase === 'fighting';
          const floatX = active ? 520 + Math.sin(elapsed * 0.8) * 9 : 500;
          const floatDepth = state.phase === 'bite' ? 34 : state.phase === 'fighting' ? Math.min(state.tension * 0.12, 10) : 0;
          const floatY = 327 + floatDepth + Math.sin(elapsed * (state.phase === 'bite' ? 8 : 2)) * (state.phase === 'bite' ? 2 : 4);
          bobber.position.set(floatX, floatY);
          bobber.rotation = state.phase === 'fighting' ? Math.min(state.tension, 100) * 0.0015 : 0;

          const distance = Math.max(0, Math.min(1, state.fishDistance));
          fish.position.set(860 - distance * 310, 515 + Math.sin(elapsed * 1.8) * 10);
          fish.scale.set((state.phase === 'fighting' ? 1 + Math.sin(elapsed * 2) * 0.05 : 0.88) * state.fishDirection, 1);
          fish.visible = state.phase === 'fighting' || state.phase === 'caught';
          if (state.fishRarity === 'king') fishColor.tint = 0xf07855;
          else if (state.fishRarity === 'rare') fishColor.tint = 0xc3cf85;
          else fishColor.tint = 0xffffff;

          line.clear()
            .moveTo(293, 425)
            .bezierCurveTo(355, 351, 416, 343 + state.tension * 0.45, floatX, floatY - 20)
            .stroke({ color: state.tension > 70 ? 0xf07855 : 0xe8dfbd, width: 2, alpha: 0.94 });

          const rippleX = active ? floatX : 500;
          ripples[0].position.set(rippleX, 354);
          ripples[1].position.set(rippleX, 354);
          ripples[2].position.set(rippleX, 354);
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
