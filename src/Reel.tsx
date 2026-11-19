import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Captions, Header, useFonts} from './components/chrome';
import {FilmLook, PartLabel, TopCaptions, captionWords} from './components/editorial';
import {Pill, ramp} from './components/ui';
import {SCENES, sceneSfx} from './scenes/scenes';
import {Mascot, MascotTrack, PoseName, poseFor} from './components/Mascot';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {C, FONT, MOOD, themeFor} from './theme';
import {FORMAT_SCENES, FULL_FRAME} from './scenes/formats';
import {MouthCtx, ThemeCtx} from './components/themeContext';

const ALL_SCENES: Record<string, React.FC<any>> = {...SCENES, ...FORMAT_SCENES};

export type ReelProps = {
  episode: any;
  timings: {totalMs: number; audio: string | null; scenes: {startMs: number; durMs: number}[]; words: any[]};
  hideCaptions?: boolean;
};

const TAG_COLOR: Record<string, string> = {problem: C.red, solution: C.green, comeback: C.amber, neutral: C.muted};

const SceneShell: React.FC<{children: React.ReactNode; dur: number}> = ({children, dur}) => {
  const frame = useCurrentFrame();
  // hard cut with a punch-in, then a slow push so nothing is ever static
  const punch = interpolate(frame, [0, 6], [1.08, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const push = interpolate(frame, [6, dur], [1, 1.035], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const inP = ramp(frame, 0, 3);
  const out = interpolate(frame, [dur - 3, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: Math.min(inP, out), transform: `scale(${punch * push})`}}>{children}</AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = ({episode, timings, hideCaptions}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const starts = timings.scenes.map((s) => f(s.startMs));
  const durs = timings.scenes.map((s, i) => (i < timings.scenes.length - 1 ? starts[i + 1] - starts[i] : f(s.durMs) + f(700)));
  let cur = 0;
  starts.forEach((s, i) => {
    if (frame >= s) cur = i;
  });
  const mood = episode.scenes[cur]?.mood ?? 'neutral';
  const prevMood = episode.scenes[Math.max(0, cur - 1)]?.mood ?? 'neutral';
  const blend = cur === 0 ? 1 : ramp(frame, starts[cur], starts[cur] + 14);
  const withMascot = episode.mascot !== false;
  const track: MascotTrack = React.useMemo(() => {
    const out: MascotTrack = [];
    let prev: PoseName | undefined;
    episode.scenes.forEach((s: any, i: number) => {
      prev = poseFor(s, i, prev);
      out.push({at: starts[i], pose: prev});
    });
    return out;
  }, [episode, starts.join(',')]);
  const audioData = useAudioData(timings.audio && withMascot ? staticFile(timings.audio) : staticFile('sfx/tick.wav'));
  // mouth follows the voice loudness, only while Debug Bro himself speaks (not the "alt" voice)
  const level = (fr: number) => {
    if (!audioData || !timings.audio) return 0;
    const v = visualizeAudio({fps, frame: fr, audioData, numberOfSamples: 32, optimizeFor: 'speed'});
    const lvl = v.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
    return Math.min(1, Math.max(0, (lvl - 0.015) * 9));
  };
  const mouth = (fr: number) => (episode.scenes[cur]?.speaker === 'alt' || episode.scenes[cur]?.who === 'intern' ? 0 : level(fr));
  const th = themeFor(episode);
  const fullFrame = FULL_FRAME.has(episode.scenes[cur]?.type);
  const hideBro = fullFrame ? ramp(frame, starts[cur], starts[cur] + 6) : cur > 0 && FULL_FRAME.has(episode.scenes[cur - 1]?.type) ? 1 - ramp(frame, starts[cur], starts[cur] + 8) : 0;

  return (
    <ThemeCtx.Provider value={th}>
    <MouthCtx.Provider value={level}>
    <AbsoluteFill style={{background: th.bg, fontFamily: FONT.sans}}>
      <Background mood={mood} prevMood={prevMood} blend={blend} />
      {timings.audio ? <Audio src={staticFile(timings.audio)} /> : null}
      {episode.music ? (
        <Audio src={staticFile(episode.music)} volume={0.07} loop />
      ) : episode.beat !== false ? (
        <Audio src={staticFile('sfx/beat.mp3')} volume={(f) => interpolate(f, [0, 20], [0, 0.11], {extrapolateRight: 'clamp'})} loop />
      ) : null}
      <div style={{opacity: interpolate(frame, [80, 95], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        <Header series={episode.series ?? 'SYSTEM DESIGN'} number={episode.number} sceneStarts={starts} sceneDurs={durs} />
      </div>
      {episode.scenes.map((s: any, i: number) => {
        const Comp = ALL_SCENES[s.type];
        if (!Comp) return null;
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={Math.max(1, durs[i])} layout="none">
            {i > 0 ? <Audio src={staticFile('sfx/whoosh.wav')} volume={0.22} /> : null}
            {sceneSfx(s, durs[i]).map((fx, k) => (
              <Sequence key={k} from={fx.at} layout="none">
                <Audio src={staticFile(fx.src)} volume={fx.vol} />
              </Sequence>
            ))}
            <SceneShell dur={durs[i]}>
              <PartLabel index={i} total={episode.scenes.length} label={(s.beat ?? s.tag ?? s.type).toLowerCase()} />
              {withMascot && !FULL_FRAME.has(s.type) ? (
                <AbsoluteFill style={{transform: 'scale(0.84)', transformOrigin: '50% 500px'}}>
                  <Comp s={s} dur={durs[i]} />
                </AbsoluteFill>
              ) : (
                <Comp s={s} dur={durs[i]} />
              )}
            </SceneShell>
          </Sequence>
        );
      })}
      {withMascot ? (
        <div style={{position: 'absolute', left: -10, top: 1110, opacity: 1 - hideBro, filter: th.dark ? 'drop-shadow(0 18px 40px #000a)' : 'drop-shadow(0 12px 24px #0003)'}}>
          <Mascot track={track} mouth={mouth} width={430} seed={episode.slug ?? 'db'} />
        </div>
      ) : null}
      <FilmLook />
      {hideCaptions ? null : episode.scenes.some((s: any) => s.cap) ? (
        <TopCaptions words={captionWords(episode, timings)} />
      ) : (
        <Captions words={timings.words} />
      )}
    </AbsoluteFill>
    </MouthCtx.Provider>
    </ThemeCtx.Provider>
  );
};

/** Cover image for the profile grid. Instagram's grid crops to the centre 3:4, so text stays in the middle. */
export const Cover: React.FC<{episode: any}> = ({episode}) => {
  useFonts();
  const words = String(episode.coverText).split(' ');
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Background mood="problem" prevMood="problem" blend={1} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: 90, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.mono, color: C.muted, fontSize: 34, letterSpacing: 6, fontWeight: 700}}>
          DEBUG<span style={{color: C.green}}>_</span>BRO · {String(episode.number).padStart(2, '0')}
        </div>
        <div style={{marginTop: 40, fontFamily: FONT.sans, fontWeight: 900, fontSize: 132, lineHeight: 1.02, letterSpacing: -3, color: C.text}}>
          {words.map((w: string, i: number) => (
            <span key={i} style={{color: i === words.length - 1 ? C.amber : C.text}}>
              {w}{' '}
            </span>
          ))}
        </div>
        <div style={{marginTop: 50}}>
          <Pill text={episode.series ?? 'SYSTEM DESIGN'} color={MOOD.solution} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
