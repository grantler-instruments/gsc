interface AudioContextOptions {
  sinkId?: string;
}

interface AudioContext {
  setSinkId(sinkId: string): Promise<void>;
}

interface HTMLMediaElement {
  setSinkId?(sinkId: string): Promise<void>;
}
