/**
 * Background Audio Stream Player
 * Plays continuous PCM audio stream from the mixer service
 */

export class BackgroundAudioPlayer {
  private audioContext: AudioContext | null = null;
  private sampleRate = 44100;
  private channels = 2;
  private isPlaying = false;
  private nextPlayTime = 0;
  private maxBufferAhead = 1.0; // Max 1 second buffered ahead

  constructor(streamUrl: string) {
    this.initAudioContext();
    this.startStreaming(streamUrl);
  }

  private initAudioContext() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate,
    });
    this.nextPlayTime = this.audioContext.currentTime;
  }

  private async startStreaming(url: string) {
    try {
      const response = await fetch(url);
      if (!response.body) {
        console.error('No response body from audio stream');
        return;
      }

      const reader = response.body.getReader();
      this.isPlaying = true;
      this.processStream(reader);
    } catch (error) {
      console.error('Error starting audio stream:', error);
    }
  }

  private async processStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
    while (this.isPlaying) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          console.log('Audio stream ended');
          break;
        }

        if (value) {
          await this.waitIfBufferFull();
          this.processPCMChunk(value);
        }
      } catch (error) {
        console.error('Error reading audio stream:', error);
        break;
      }
    }
  }

  private async waitIfBufferFull(): Promise<void> {
    if (!this.audioContext) return;

    const bufferAhead = this.nextPlayTime - this.audioContext.currentTime;
    if (bufferAhead > this.maxBufferAhead) {
      const waitTime = (bufferAhead - this.maxBufferAhead) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private processPCMChunk(pcmData: Uint8Array) {
    if (!this.audioContext) return;

    const samples = this.pcmToFloat32(pcmData);
    const framesCount = samples.length / this.channels;
    const leftChannel = new Float32Array(framesCount);
    const rightChannel = new Float32Array(framesCount);

    for (let i = 0; i < framesCount; i++) {
      leftChannel[i] = samples[i * 2];
      rightChannel[i] = samples[i * 2 + 1];
    }

    const audioBuffer = this.audioContext.createBuffer(
      this.channels,
      framesCount,
      this.sampleRate
    );

    audioBuffer.getChannelData(0).set(leftChannel);
    audioBuffer.getChannelData(1).set(rightChannel);

    this.scheduleBuffer(audioBuffer);
  }

  private pcmToFloat32(pcmData: Uint8Array): Float32Array {
    const samples = new Float32Array(pcmData.length / 2);
    const view = new DataView(pcmData.buffer);

    for (let i = 0; i < samples.length; i++) {
      const int16 = view.getInt16(i * 2, true);
      samples[i] = int16 / 32768.0;
    }

    return samples;
  }

  private scheduleBuffer(audioBuffer: AudioBuffer) {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;

    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  public stop() {
    this.isPlaying = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
