// AudioWorklet processor — captures 128-frame PCM quanta and posts Int16 chunks to the main thread
class PcmCollectorProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channel = input[0];
    if (!channel || channel.length === 0) {
      return true;
    }

    const int16 = new Int16Array(channel.length);

    for (let index = 0; index < channel.length; index += 1) {
      const sample = channel[index];
      const clamped = Math.max(-1, Math.min(1, sample));
      int16[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    this.port.postMessage({ type: 'pcm', samples: int16.buffer }, [int16.buffer]);
    return true;
  }
}

registerProcessor('pcm-collector', PcmCollectorProcessor);
