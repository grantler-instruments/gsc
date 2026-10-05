interface MockParam {
  value: number;
  cancelScheduledValues?: (cancelTime: number) => void;
  setValueAtTime?: (value: number, startTime: number) => void;
  setValueCurveAtTime?: (values: Float32Array, startTime: number, duration: number) => void;
}

export interface MockAudioNode {
  connect: (destination: MockAudioNode) => MockAudioNode;
  disconnect: () => void;
  gain?: MockParam;
  pan?: MockParam;
}

/** AudioParam stand-in that accepts (and ignores) automation calls. */
export function createMockAudioParam(value: number): MockParam {
  return {
    value,
    cancelScheduledValues: () => {},
    setValueAtTime: () => {},
    setValueCurveAtTime: () => {},
  };
}

export function createMockAudioNode(overrides: Partial<MockAudioNode> = {}): MockAudioNode {
  const connections: MockAudioNode[] = [];
  return {
    connect(destination: MockAudioNode) {
      connections.push(destination);
      return destination;
    },
    disconnect() {
      connections.length = 0;
    },
    ...overrides,
  };
}

/** Minimal AudioContext stand-in for node-only mixer tests in Vitest (node env). */
export function createMockAudioContext(): AudioContext {
  const destination = createMockAudioNode();
  return {
    destination,
    sampleRate: 48000,
    state: "running",
    createChannelSplitter: () => createMockAudioNode(),
    createAnalyser: () => ({
      ...createMockAudioNode(),
      fftSize: 2048,
      getFloatTimeDomainData: (data: Float32Array) => data.fill(0),
    }),
    createGain: () => createMockAudioNode({ gain: createMockAudioParam(1) }),
    createStereoPanner: () => createMockAudioNode({ pan: { value: 0 } }),
  } as unknown as AudioContext;
}
