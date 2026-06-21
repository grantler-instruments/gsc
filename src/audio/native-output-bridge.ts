const WORKLET_SOURCE = `
class GscCpalCapture extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input?.[0]?.length || !output?.[0]) return true;

    const left = input[0];
    const right = input[1] ?? input[0];
    const frameCount = left.length;
    const interleaved = new Float32Array(frameCount * 2);

    for (let index = 0; index < frameCount; index++) {
      const sampleLeft = left[index] ?? 0;
      const sampleRight = right[index] ?? sampleLeft;
      interleaved[index * 2] = sampleLeft;
      interleaved[index * 2 + 1] = sampleRight;
      if (output[0]) output[0][index] = 0;
      if (output[1]) output[1][index] = 0;
    }

    this.port.postMessage(interleaved);
    return true;
  }
}
registerProcessor("gsc-cpal-capture", GscCpalCapture);
`;

let workletModuleUrl: string | null = null;

function getWorkletModuleUrl(): string {
  if (!workletModuleUrl) {
    workletModuleUrl = URL.createObjectURL(
      new Blob([WORKLET_SOURCE], { type: "application/javascript" }),
    );
  }
  return workletModuleUrl;
}

function connectSilentSink(ctx: AudioContext, node: AudioNode): void {
  const silentSink = ctx.createGain();
  silentSink.gain.value = 0;
  node.connect(silentSink);
  // Do not connect to ctx.destination — WKWebView still routes to speakers.
}

function createScriptProcessorCapture(
  ctx: AudioContext,
  onPcm: (samples: Float32Array) => void,
): ScriptProcessorNode {
  const processor = ctx.createScriptProcessor(4096, 2, 2);
  processor.onaudioprocess = (event) => {
    const left = event.inputBuffer.getChannelData(0);
    const right =
      event.inputBuffer.numberOfChannels > 1 ? event.inputBuffer.getChannelData(1) : left;
    const outLeft = event.outputBuffer.getChannelData(0);
    const outRight =
      event.outputBuffer.numberOfChannels > 1 ? event.outputBuffer.getChannelData(1) : outLeft;
    const interleaved = new Float32Array(left.length * 2);
    for (let index = 0; index < left.length; index++) {
      interleaved[index * 2] = left[index] ?? 0;
      interleaved[index * 2 + 1] = right[index] ?? left[index] ?? 0;
      outLeft[index] = 0;
      if (outRight) outRight[index] = 0;
    }
    onPcm(interleaved);
  };
  connectSilentSink(ctx, processor);
  return processor;
}

export async function createCpalCaptureNode(
  ctx: AudioContext,
  onPcm: (samples: Float32Array) => void,
): Promise<AudioNode> {
  try {
    await ctx.audioWorklet.addModule(getWorkletModuleUrl());
    const node = new AudioWorkletNode(ctx, "gsc-cpal-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (event.data instanceof Float32Array && event.data.length > 0) {
        onPcm(event.data);
      }
    };
    connectSilentSink(ctx, node);
    return node;
  } catch (err) {
    console.warn("[audio] AudioWorklet capture unavailable, using ScriptProcessor fallback", err);
    return createScriptProcessorCapture(ctx, onPcm);
  }
}

export function disposeCpalCaptureNode(node: AudioNode): void {
  if (node instanceof AudioWorkletNode) {
    node.port.onmessage = null;
  }
  if (node instanceof ScriptProcessorNode) {
    node.onaudioprocess = null;
  }
  node.disconnect();
}
