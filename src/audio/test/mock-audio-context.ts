interface MockParam {
  value: number;
}

export interface MockAudioNode {
  connect: (destination: MockAudioNode) => MockAudioNode;
  disconnect: () => void;
  gain?: MockParam;
  pan?: MockParam;
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
    createGain: () => createMockAudioNode({ gain: { value: 1 } }),
    createStereoPanner: () => createMockAudioNode({ pan: { value: 0 } }),
  } as unknown as AudioContext;
}
