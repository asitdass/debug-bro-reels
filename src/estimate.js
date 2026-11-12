// Estimated timings for when no voice audio exists (studio preview, engine = "silent").
// Hinglish narration runs at roughly 2.7 words per second.
export function estimateTimings(episode, wps = 2.7, gapMs = 250) {
  let t = 300;
  const scenes = [];
  const words = [];
  episode.scenes.forEach((s, i) => {
    const ws = s.vo.split(/\s+/).filter(Boolean);
    const dur = Math.max(1800, (ws.length / wps) * 1000);
    const per = dur / ws.length;
    ws.forEach((w, j) => words.push({text: w, startMs: t + j * per, endMs: t + (j + 1) * per - 40, scene: i}));
    scenes.push({startMs: i === 0 ? 0 : t, durMs: dur + (i === 0 ? 300 : 0)});
    t += dur + gapMs;
  });
  return {totalMs: t, audio: null, scenes, words};
}
