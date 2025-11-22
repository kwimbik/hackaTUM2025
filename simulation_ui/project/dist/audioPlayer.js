/**
 * Background Audio Stream Player
 * Plays continuous PCM audio stream from the mixer service
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class BackgroundAudioPlayer {
    constructor(streamUrl) {
        this.audioContext = null;
        this.sampleRate = 44100;
        this.channels = 2;
        this.isPlaying = false;
        this.nextPlayTime = 0;
        this.maxBufferAhead = 1.0; // Max 1 second buffered ahead
        this.initAudioContext();
        this.startStreaming(streamUrl);
    }
    initAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: this.sampleRate,
        });
        this.nextPlayTime = this.audioContext.currentTime;
    }
    startStreaming(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(url);
                if (!response.body) {
                    console.error('No response body from audio stream');
                    return;
                }
                const reader = response.body.getReader();
                this.isPlaying = true;
                this.processStream(reader);
            }
            catch (error) {
                console.error('Error starting audio stream:', error);
            }
        });
    }
    processStream(reader) {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.isPlaying) {
                try {
                    const { done, value } = yield reader.read();
                    if (done) {
                        console.log('Audio stream ended');
                        break;
                    }
                    if (value) {
                        yield this.waitIfBufferFull();
                        this.processPCMChunk(value);
                    }
                }
                catch (error) {
                    console.error('Error reading audio stream:', error);
                    break;
                }
            }
        });
    }
    waitIfBufferFull() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.audioContext)
                return;
            const bufferAhead = this.nextPlayTime - this.audioContext.currentTime;
            if (bufferAhead > this.maxBufferAhead) {
                const waitTime = (bufferAhead - this.maxBufferAhead) * 1000;
                yield new Promise(resolve => setTimeout(resolve, waitTime));
            }
        });
    }
    processPCMChunk(pcmData) {
        if (!this.audioContext)
            return;
        const samples = this.pcmToFloat32(pcmData);
        const framesCount = samples.length / this.channels;
        const leftChannel = new Float32Array(framesCount);
        const rightChannel = new Float32Array(framesCount);
        for (let i = 0; i < framesCount; i++) {
            leftChannel[i] = samples[i * 2];
            rightChannel[i] = samples[i * 2 + 1];
        }
        const audioBuffer = this.audioContext.createBuffer(this.channels, framesCount, this.sampleRate);
        audioBuffer.getChannelData(0).set(leftChannel);
        audioBuffer.getChannelData(1).set(rightChannel);
        this.scheduleBuffer(audioBuffer);
    }
    pcmToFloat32(pcmData) {
        const samples = new Float32Array(pcmData.length / 2);
        const view = new DataView(pcmData.buffer);
        for (let i = 0; i < samples.length; i++) {
            const int16 = view.getInt16(i * 2, true);
            samples[i] = int16 / 32768.0;
        }
        return samples;
    }
    scheduleBuffer(audioBuffer) {
        if (!this.audioContext)
            return;
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
    stop() {
        this.isPlaying = false;
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
