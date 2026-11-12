import React from 'react';
import {Composition, Still} from 'remotion';
import {Cover, Reel, ReelProps} from './Reel';
import {FPS, H, W} from './theme';
import sample from '../episodes/sample.json';
import {estimateTimings} from './estimate';

const sampleProps: ReelProps = {episode: sample, timings: estimateTimings(sample)};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={Reel as any}
      width={W}
      height={H}
      fps={FPS}
      durationInFrames={300}
      defaultProps={sampleProps as any}
      calculateMetadata={({props}: any) => ({
        durationInFrames: Math.ceil(((props.timings.totalMs + 900) / 1000) * FPS),
      })}
    />
    <Still id="Cover" component={Cover as any} width={W} height={H} defaultProps={{episode: sample} as any} />
  </>
);
