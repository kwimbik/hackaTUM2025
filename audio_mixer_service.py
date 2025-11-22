"""
Audio Mixer Service for Sports Simulation
Handles TTS generation, background crowd audio, and dynamic mixing
"""

from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import os
import random
import time
import threading
from queue import Queue
import subprocess
from collections import deque
import struct
import uuid
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# ElevenLabs configuration
ELEVENLABS_API_KEY = os.getenv('Eleven_API', '')

class AudioMixer:
    def __init__(self, base_dir, positive_dir, negative_dir, chunk_duration_ms=100):
        """Audio mixer with TTS support and PCM streaming."""
        self.chunk_duration_ms = chunk_duration_ms
        self.crossfade_duration_ms = 2000
        self.loop_crossfade_duration_ms = 1500  # 1.5 second crossfade for background loop

        # Check ffmpeg
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise RuntimeError("ffmpeg not found. Install with: sudo apt-get install ffmpeg")

        self.base_files = self._load_file_paths(base_dir)
        self.positive_files = self._load_file_paths(positive_dir)
        self.negative_files = self._load_file_paths(negative_dir)

        if not self.base_files:
            raise ValueError(f"No audio files found in {base_dir}")

        self.excitement = 0
        self.previous_excitement = 0

        self.sample_rate = 44100
        self.channels = 2
        self.sample_width = 2  # 16-bit

        self.base_audio = self._load_audio_as_pcm(random.choice(self.base_files))
        self.base_position = 0

        self.excitement_audio = None
        self.excitement_position = 0
        self.is_playing_excitement = False

        self.base_volume = 1.0
        self.excitement_volume = 0.0

        # TTS storage and queue
        self.tts_storage = {}  # audioId -> PCM data
        self.tts_queue = Queue()
        self.active_tts = None
        self.tts_position = 0
        self.tts_volume = 1.0

        self.metadata_queue = deque(maxlen=100)
        self.running = True

    def _load_file_paths(self, directory):
        """Load all MP3 file paths from directory."""
        if not os.path.exists(directory):
            print(f"Warning: Directory not found: {directory}")
            return []

        files = []
        for filename in os.listdir(directory):
            if filename.lower().endswith('.mp3'):
                filepath = os.path.join(directory, filename)
                files.append(filepath)
        return files

    def _load_audio_as_pcm(self, filepath):
        """Load audio file and convert to PCM using ffmpeg."""
        print(f"Loading: {os.path.basename(filepath)}")

        cmd = [
            'ffmpeg',
            '-i', filepath,
            '-f', 's16le',
            '-acodec', 'pcm_s16le',
            '-ar', str(self.sample_rate),
            '-ac', str(self.channels),
            '-'
        ]

        result = subprocess.run(cmd, capture_output=True, check=True)
        return result.stdout

    def _get_base_chunk(self):
        """Get next chunk of base audio with crossfade looping."""
        bytes_per_sample = self.channels * self.sample_width
        chunk_size_bytes = int((self.chunk_duration_ms / 1000.0) * self.sample_rate * bytes_per_sample)
        crossfade_bytes = int((self.loop_crossfade_duration_ms / 1000.0) * self.sample_rate * bytes_per_sample)

        audio_length = len(self.base_audio)

        # Check if we're in the crossfade region (near the end)
        if self.base_position + chunk_size_bytes > audio_length - crossfade_bytes:
            # We're in crossfade region - mix end with beginning

            # Get chunk from current position
            end_chunk = self.base_audio[self.base_position:self.base_position + chunk_size_bytes]

            # Calculate how far into the crossfade region we are
            distance_from_crossfade_start = self.base_position - (audio_length - crossfade_bytes)
            crossfade_progress = max(0, distance_from_crossfade_start) / crossfade_bytes

            # Get corresponding chunk from the beginning
            begin_chunk = self.base_audio[0:chunk_size_bytes]

            # Apply crossfade volumes
            end_volume = 1.0 - crossfade_progress
            begin_volume = crossfade_progress

            end_chunk = self._apply_volume_to_pcm(end_chunk, end_volume)
            begin_chunk = self._apply_volume_to_pcm(begin_chunk, begin_volume)

            # Mix the two chunks
            chunk = self._mix_pcm(end_chunk, begin_chunk)

            # Update position and wrap if needed
            self.base_position += len(end_chunk)
            if self.base_position >= audio_length:
                self.base_position = self.base_position - audio_length
        else:
            # Normal playback - no crossfade needed
            chunk = self.base_audio[self.base_position:self.base_position + chunk_size_bytes]
            self.base_position += len(chunk)

        return chunk

    def _apply_volume_to_pcm(self, pcm_data, volume):
        """Apply volume scaling to PCM data."""
        if volume >= 1.0:
            return pcm_data

        samples = []
        for i in range(0, len(pcm_data), 2):
            if i + 1 < len(pcm_data):
                sample = struct.unpack('<h', pcm_data[i:i+2])[0]
                sample = int(sample * volume)
                sample = max(-32768, min(32767, sample))
                samples.append(struct.pack('<h', sample))

        return b''.join(samples)

    def _mix_pcm(self, pcm1, pcm2):
        """Mix two PCM byte streams."""
        min_len = min(len(pcm1), len(pcm2))
        mixed = []

        for i in range(0, min_len, 2):
            if i + 1 < min_len:
                s1 = struct.unpack('<h', pcm1[i:i+2])[0]
                s2 = struct.unpack('<h', pcm2[i:i+2])[0]

                mixed_sample = s1 + s2
                mixed_sample = max(-32768, min(32767, mixed_sample))

                mixed.append(struct.pack('<h', mixed_sample))

        result = b''.join(mixed)

        if len(pcm1) > min_len:
            result += pcm1[min_len:]
        elif len(pcm2) > min_len:
            result += pcm2[min_len:]

        return result

    def _mix_audio_chunk(self):
        """Generate one chunk of mixed audio (base + excitement + TTS)."""
        base_chunk = self._get_base_chunk()
        base_chunk = self._apply_volume_to_pcm(base_chunk, self.base_volume)

        mixed = base_chunk

        bytes_per_sample = self.channels * self.sample_width
        chunk_size_bytes = int((self.chunk_duration_ms / 1000.0) * self.sample_rate * bytes_per_sample)

        if self.excitement_audio and self.excitement_position < len(self.excitement_audio):
            excitement_chunk = self.excitement_audio[
                self.excitement_position:self.excitement_position + chunk_size_bytes
            ]
            self.excitement_position += len(excitement_chunk)

            excitement_chunk = self._apply_volume_to_pcm(excitement_chunk, self.excitement_volume)
            mixed = self._mix_pcm(mixed, excitement_chunk)

        if self.active_tts and self.tts_position < len(self.active_tts):
            tts_chunk = self.active_tts[
                self.tts_position:self.tts_position + chunk_size_bytes
            ]
            tts_chunk = self._apply_volume_to_pcm(tts_chunk, self.tts_volume)

            mixed = self._mix_pcm(mixed, tts_chunk)
            self.tts_position += len(tts_chunk)

            if self.tts_position >= len(self.active_tts):
                print("TTS finished")
                self.metadata_queue.append({
                    'type': 'tts_end',
                    'timestamp': time.time()
                })
                self.active_tts = None
                self.tts_position = 0

                if not self.tts_queue.empty():
                    self._start_next_tts()
        elif not self.tts_queue.empty() and self.active_tts is None:
            self._start_next_tts()

        return mixed

    def _start_next_tts(self):
        """Start playing the next TTS from queue."""
        tts_audio = self.tts_queue.get()
        self.active_tts = tts_audio
        self.tts_position = 0

        bytes_per_sample = self.channels * self.sample_width
        duration_seconds = len(tts_audio) / (self.sample_rate * bytes_per_sample)
        print(f"Starting TTS (duration: {duration_seconds:.2f}s)")

        self.metadata_queue.append({
            'type': 'tts_start',
            'duration': duration_seconds,
            'timestamp': time.time()
        })

    def generate_audio_stream(self):
        """Generator that yields PCM chunks at real-time rate."""
        chunk_duration_seconds = self.chunk_duration_ms / 1000.0

        while self.running:
            try:
                chunk_start_time = time.time()

                chunk = self._mix_audio_chunk()
                if chunk:
                    yield chunk

                # Rate limit to real-time
                elapsed = time.time() - chunk_start_time
                sleep_time = chunk_duration_seconds - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)

            except Exception as e:
                print(f"Error generating audio: {e}")
                import traceback
                traceback.print_exc()
                time.sleep(0.01)

    def generate_tts(self, text):
        """Generate TTS audio using ElevenLabs API and store it."""
        if not ELEVENLABS_API_KEY:
            print("Warning: No ElevenLabs API key set")
            return None, 0

        try:
            import requests

            response = requests.post(
                'https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB',
                headers={
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY
                },
                json={
                    'text': text,
                    'model_id': 'eleven_monolingual_v1',
                    'voice_settings': {
                        'stability': 0.5,
                        'similarity_boost': 0.5
                    }
                }
            )

            if response.status_code != 200:
                print(f"ElevenLabs API error: {response.status_code}")
                return None, 0

            mp3_data = response.content
            pcm_data = self._mp3_to_pcm(mp3_data)

            audio_id = str(uuid.uuid4())
            self.tts_storage[audio_id] = pcm_data

            bytes_per_sample = self.channels * self.sample_width
            duration = len(pcm_data) / (self.sample_rate * bytes_per_sample)

            print(f"Generated TTS: {audio_id} ({duration:.2f}s)")
            return audio_id, duration

        except Exception as e:
            print(f"Failed to generate TTS: {e}")
            return None, 0

    def play_tts_by_id(self, audio_id):
        """Queue TTS audio for playback."""
        if audio_id in self.tts_storage:
            self.tts_queue.put(self.tts_storage[audio_id])
            print(f"Queued TTS audio: {audio_id}")
            return True
        else:
            print(f"TTS audio not found: {audio_id}")
            return False

    def _mp3_to_pcm(self, mp3_data):
        """Convert MP3 data to PCM."""
        cmd = [
            'ffmpeg',
            '-i', '-',
            '-f', 's16le',
            '-acodec', 'pcm_s16le',
            '-ar', str(self.sample_rate),
            '-ac', str(self.channels),
            '-'
        ]

        result = subprocess.run(cmd, input=mp3_data, capture_output=True, check=True)
        return result.stdout

    def update_excitement(self, value):
        """Update excitement level (-1, 0, 1)."""
        if value not in [-1, 0, 1]:
            return

        trigger = False
        if value != 0 and not self.is_playing_excitement:
            if self.previous_excitement == 0:
                trigger = True
            elif self.previous_excitement != 0 and self.previous_excitement != value:
                trigger = True

        if trigger:
            self.is_playing_excitement = True
            threading.Thread(
                target=self._trigger_excitement,
                args=(value,),
                daemon=True
            ).start()

        self.previous_excitement = self.excitement
        self.excitement = value

    def _trigger_excitement(self, excitement_value):
        """Trigger excitement audio in background thread."""
        if excitement_value == 1:
            files = self.positive_files
            excitement_type = "positive"
        elif excitement_value == -1:
            files = self.negative_files
            excitement_type = "negative"
        else:
            self.is_playing_excitement = False
            return

        if not files:
            print(f"Warning: No {excitement_type} files available")
            self.is_playing_excitement = False
            return

        excitement_file = random.choice(files)
        print(f"Triggering {excitement_type}: {os.path.basename(excitement_file)}")

        self.excitement_audio = self._load_audio_as_pcm(excitement_file)
        self.excitement_position = 0

        self._crossfade_excitement(fade_in=True)

        bytes_per_sample = self.channels * self.sample_width
        excitement_duration = len(self.excitement_audio) / (self.sample_rate * bytes_per_sample)
        wait_time = excitement_duration - (self.crossfade_duration_ms / 1000.0)
        if wait_time > 0:
            time.sleep(wait_time)

        self._crossfade_excitement(fade_in=False)

        self.excitement_audio = None
        self.excitement_position = 0
        self.is_playing_excitement = False

    def _crossfade_excitement(self, fade_in=True):
        """Crossfade excitement audio in or out."""
        duration = self.crossfade_duration_ms / 1000.0
        steps = 20
        step_duration = duration / steps

        for i in range(steps + 1):
            t = i / steps
            if fade_in:
                self.base_volume = 1.0 - (0.7 * t)
                self.excitement_volume = t
            else:
                self.base_volume = 0.3 + (0.7 * t)
                self.excitement_volume = 1.0 - t

            time.sleep(step_duration)

    def get_metadata(self):
        """Get queued metadata events."""
        events = []
        while self.metadata_queue:
            events.append(self.metadata_queue.popleft())
        return events


mixer = None

@app.route('/audio_stream')
def audio_stream():
    """Stream continuous mixed audio as raw PCM."""
    return Response(
        mixer.generate_audio_stream(),
        mimetype='application/octet-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
            'X-Audio-Format': 'pcm_s16le',
            'X-Sample-Rate': '44100',
            'X-Channels': '2'
        }
    )

@app.route('/generate_tts', methods=['POST'])
def generate_tts():
    """Generate TTS and return audio ID and duration."""
    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        audio_id, duration = mixer.generate_tts(text)

        if audio_id:
            return jsonify({
                'status': 'success',
                'audioId': audio_id,
                'duration': duration
            })
        else:
            return jsonify({'error': 'TTS generation failed'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/play_event_audio', methods=['POST'])
def play_event_audio():
    """Queue TTS audio for playback."""
    try:
        data = request.get_json()
        audio_id = data.get('audioId', '')

        if not audio_id:
            return jsonify({'error': 'No audioId provided'}), 400

        success = mixer.play_tts_by_id(audio_id)

        if success:
            return jsonify({'status': 'success', 'message': 'Audio queued for playback'})
        else:
            return jsonify({'error': 'Audio ID not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/set_excitement', methods=['POST'])
def set_excitement():
    """Set crowd excitement level."""
    try:
        data = request.get_json()
        value = data.get('excitement', 0)
        mixer.update_excitement(value)
        return jsonify({'status': 'success', 'excitement': value})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/metadata')
def get_metadata():
    """Get timing metadata for TTS events."""
    events = mixer.get_metadata()
    return jsonify({'events': events})

@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'running',
        'tts_queue_size': mixer.tts_queue.qsize(),
        'is_playing_excitement': mixer.is_playing_excitement,
        'tts_storage_count': len(mixer.tts_storage)
    })


if __name__ == '__main__':
    os.makedirs("audio/base", exist_ok=True)
    os.makedirs("audio/positive", exist_ok=True)
    os.makedirs("audio/negative", exist_ok=True)

    print("Expected directory structure:")
    print("  audio/")
    print("    base/       - base crowd ambience files")
    print("    positive/   - cheering files")
    print("    negative/   - booing files")
    print()

    try:
        mixer = AudioMixer(
            base_dir="audio/base",
            positive_dir="audio/positive",
            negative_dir="audio/negative"
        )

        print("Audio Mixer Service Starting...")
        print("Endpoints:")
        print("  GET  /audio_stream       - Continuous mixed audio stream")
        print("  POST /generate_tts       - Generate TTS: {\"text\": \"...\"}")
        print("  POST /play_event_audio   - Play TTS: {\"audioId\": \"...\"}")
        print("  POST /set_excitement     - Set excitement: {\"excitement\": -1|0|1}")
        print("  GET  /metadata           - Get TTS timing events")
        print("  GET  /health             - Health check")
        print()

        app.run(host='0.0.0.0', port=5000, threaded=True)

    except ValueError as e:
        print(f"Error: {e}")
        print("Please add MP3 files to the audio/base directory")
