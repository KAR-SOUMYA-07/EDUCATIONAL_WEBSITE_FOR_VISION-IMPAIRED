import os
import json
import base64
import tempfile
import time
from io import BytesIO
from typing import Dict, List, Optional

import numpy as np
import whisper
import soundfile as sf
from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa

# Enhanced braille translation system
# Comprehensive Grade 1 Braille with contractions and better Unicode support

class EnhancedBrailleTranslator:
    """Enhanced braille translator with comprehensive mappings"""
    
    def __init__(self):
        # Basic alphabet mapping
        self.letter_map = {
            'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋', 'g': '⠛', 'h': '⠓',
            'i': '⠊', 'j': '⠚', 'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏',
            'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞', 'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭',
            'y': '⠽', 'z': '⠵'
        }
        
        # Numbers (with number indicator)
        self.number_map = {
            '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
            '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚'
        }
        
        # Punctuation and symbols
        self.punctuation_map = {
            ' ': '⠀',    # space
            '.': '⠲',    # period
            ',': '⠂',    # comma
            '!': '⠖',    # exclamation
            '?': '⠦',    # question
            "'": '⠄',    # apostrophe
            '"': '⠦',    # quotation
            ':': '⠒',    # colon
            ';': '⠆',    # semicolon
            '-': '⠤',    # hyphen
            '(': '⠶',    # open parenthesis
            ')': '⠶',    # close parenthesis
            '/': '⠌',    # slash
            '&': '⠯',    # ampersand
            '*': '⠔',    # asterisk
            '@': '⠈⠁',  # at sign
            '#': '⠼',    # number sign
            '$': '⠈⠎',  # dollar sign
            '%': '⠨⠴',  # percent
            '+': '⠖',    # plus
            '=': '⠶',    # equals
            '<': '⠈⠣',  # less than
            '>': '⠈⠜',  # greater than
            '[': '⠈⠷',  # open bracket
            ']': '⠈⠾',  # close bracket
            '{': '⠨⠷',  # open brace
            '}': '⠨⠾',  # close brace
        }
        
        # Common contractions for Grade 1 Braille
        self.contractions = {
            'and': '⠯',
            'for': '⠿',
            'of': '⠷',
            'the': '⠮',
            'with': '⠾',
            'to': '⠞⠕',
            'in': '⠔',
            'it': '⠭',
            'you': '⠽',
            'that': '⠞⠓⠁⠞',
            'will': '⠺',
            'have': '⠓',
            'are': '⠜',
            'be': '⠆',
            'his': '⠓⠊⠎',
            'was': '⠺⠁⠎',
            'one': '⠐⠕',
            'had': '⠓⠁⠙',
            'but': '⠃',
            'not': '⠝',
            'were': '⠸⠺',
            'been': '⠃⠑⠑⠝',
            'have': '⠓⠧',
            'their': '⠸⠮',
            'said': '⠎⠁⠊⠙',
            'each': '⠂⠑',
            'which': '⠱',
            'she': '⠎⠓',
            'do': '⠙',
            'how': '⠓⠪',
            'know': '⠅⠝',
            'go': '⠛',
            'me': '⠍⠑',
            'us': '⠥⠎',
            'day': '⠙⠁⠽',
            'get': '⠛⠑⠞',
            'come': '⠉⠕⠍⠑',
            'good': '⠛⠙',
            'time': '⠞⠊⠍⠑',
            'very': '⠧⠑⠗⠽',
            'when': '⠱⠓⠑⠝',
            'much': '⠍⠥⠉⠓',
            'before': '⠃⠑⠋⠕⠗⠑',
            'here': '⠓⠑⠗⠑',
            'through': '⠞⠓⠗⠕⠥⠛⠓',
            'work': '⠺⠕⠗⠅',
            'where': '⠱⠓⠑⠗⠑',
        }
        
        # Special indicators
        self.capital_indicator = '⠠'
        self.number_indicator = '⠼'
        
    def text_to_braille_enhanced(self, text: str) -> str:
        """Convert text to braille with contractions and enhanced mapping"""
        if not text:
            return ''
            
        result = []
        words = text.split()
        
        for word in words:
            # Check for contractions first (case insensitive)
            word_lower = word.lower().strip('.,!?;:"()[]{}')
            if word_lower in self.contractions:
                # Handle capitalization
                if word[0].isupper():
                    result.append(self.capital_indicator + self.contractions[word_lower])
                else:
                    result.append(self.contractions[word_lower])
            else:
                # Process character by character
                braille_word = ''
                for char in word:
                    if char.isupper():
                        braille_word += self.capital_indicator
                        char = char.lower()
                    
                    if char in self.letter_map:
                        braille_word += self.letter_map[char]
                    elif char in self.number_map:
                        braille_word += self.number_map[char]
                    elif char in self.punctuation_map:
                        braille_word += self.punctuation_map[char]
                    else:
                        # Unknown character, use generic symbol
                        braille_word += '⠸'
                
                result.append(braille_word)
        
        return '⠀'.join(result)  # Join with braille space

    @staticmethod
    def textToBraille(text: str) -> str:
        """Static method compatible with braillelib API"""
        translator = EnhancedBrailleTranslator()
        return translator.text_to_braille_enhanced(text)

# Use Enhanced Built-in Braille Translator (braillelib had installation issues)
print("✅ Using Enhanced Built-in Braille Translator with contractions")
BRAILLE_LIBRARY_AVAILABLE = False

# Create braillelib-compatible interface for any legacy code
class braillelib:
    @staticmethod
    def textToBraille(text: str) -> str:
        return EnhancedBrailleTranslator.textToBraille(text)


class AudioProcessor:
    """Handles audio processing and transcription using OpenAI Whisper"""
    
    def __init__(self, model_name: str = "base"):
        """Initialize Whisper model"""
        print(f"Loading Whisper model: {model_name}")
        self.model = whisper.load_model(model_name)
        print("Whisper model loaded successfully")
    
    def transcribe_audio(self, audio_data: np.ndarray, sample_rate: int = 16000) -> Dict:
        """Transcribe audio using Whisper"""
        try:
            # Ensure audio data is not empty
            if len(audio_data) == 0:
                return {
                    "success": False,
                    "error": "Empty audio data",
                    "transcript": ""
                }
            
            # Whisper expects 16kHz mono audio
            if sample_rate != 16000:
                audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=16000)
            
            # Ensure audio is in correct format and not empty after resampling
            audio_data = audio_data.astype(np.float32)
            
            if len(audio_data) < 1600:  # Less than 0.1 seconds at 16kHz
                return {
                    "success": True,
                    "transcript": "",
                    "language": "en",
                    "segments": []
                }
            
            # Normalize audio to prevent clipping
            if np.max(np.abs(audio_data)) > 0:
                audio_data = audio_data / np.max(np.abs(audio_data))
            
            # Transcribe using Whisper
            result = self.model.transcribe(audio_data, language="en", fp16=False)
            
            # Extract text safely
            text = result.get("text", "")
            if isinstance(text, str):
                transcript = text.strip()
            else:
                transcript = str(text).strip() if text else ""
            
            return {
                "success": True,
                "transcript": transcript,
                "language": result.get("language", "en"),
                "segments": result.get("segments", [])
            }
        
        except Exception as e:
            print(f"Transcription error: {e}")
            return {
                "success": False,
                "error": str(e),
                "transcript": ""
            }


class BrailleTranslator:
    """Handles text to braille translation using liblouis via pylouis"""
    
    def __init__(self, table: str = "en-us-g1.ctb"):
        """Initialize liblouis translator"""
        self.table = table
        print(f"Braille translator initialized with table: {table}")
    
    def text_to_braille(self, text: str) -> Dict:
        """Convert text to braille using enhanced braille system"""
        try:
            if not text.strip():
                return {"success": True, "braille": "", "original": text}
            
            # Use enhanced braille translator
            braille_text = braillelib.textToBraille(text)
            method_used = "enhanced-builtin-contractions" if not BRAILLE_LIBRARY_AVAILABLE else "braillelib-enhanced"
            
            return {
                "success": True,
                "braille": braille_text,
                "original": text,
                "table": self.table,
                "method": method_used
            }
        
        except Exception as e:
            print(f"Braille translation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "braille": "",
                "original": text
            }
    
    def get_available_tables(self) -> List[str]:
        """Get list of available braille tables"""
        try:
            return ["en-us-g1.ctb", "en-us-g2.ctb", "unicode.dis"]
        except Exception as e:
            print(f"Error getting braille tables: {e}")
            return ["en-us-g1.ctb"]


# Initialize services
app = Flask(__name__)
app.config['SECRET_KEY'] = 'voice_learning_platform_secret'
CORS(app, origins=["http://localhost:3001", "http://localhost:3000"])

# Initialize processors
audio_processor = AudioProcessor()
braille_translator = BrailleTranslator()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "services": {
            "whisper": True,
            "braille": True
        }
    })


@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio to text using Whisper"""
    try:
        data = request.get_json()
        
        if 'audio_data' not in data:
            return jsonify({"error": "No audio data provided"}), 400
        
        # Decode base64 audio data
        audio_base64 = data['audio_data']
        audio_bytes = base64.b64decode(audio_base64)
        
        # Get sample rate (default 16000)
        sample_rate = data.get('sample_rate', 16000)
        
        # Load audio data
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        
        try:
            # Load audio using soundfile
            audio_data, sr = sf.read(temp_path)
            
            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)
            
            # Transcribe
            result = audio_processor.transcribe_audio(audio_data, sr)
            
            return jsonify(result)
        
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        print(f"Transcription API error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/braille', methods=['POST'])
def translate_to_braille():
    """Translate text to braille using pylouis"""
    try:
        data = request.get_json()
        
        if 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        table = data.get('table', 'en-us-g1.ctb')
        
        # Update translator table if needed
        if table != braille_translator.table:
            braille_translator.table = table
        
        result = braille_translator.text_to_braille(text)
        return jsonify(result)
    
    except Exception as e:
        print(f"Braille translation API error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/process-audio', methods=['POST'])
def process_audio():
    """Process audio: transcribe and translate to braille"""
    try:
        data = request.get_json()
        
        if 'audio_data' not in data:
            return jsonify({"error": "No audio data provided"}), 400
        
        # Decode and transcribe audio
        audio_base64 = data['audio_data']
        
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception as e:
            return jsonify({"error": f"Invalid base64 audio data: {e}"}), 400
            
        sample_rate = data.get('sample_rate', 16000)
        
        # Load audio data with better error handling
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        
        try:
            # Load and transcribe audio with improved handling
            try:
                audio_data, sr = sf.read(temp_path)
                
                # Handle empty or invalid audio
                if len(audio_data) == 0:
                    return jsonify({
                        "success": True,
                        "transcript": "",
                        "braille": "",
                        "language": "en",
                        "segments": [],
                        "braille_table": "en-us-g1.ctb"
                    })
                
                # Convert to mono if stereo
                if len(audio_data.shape) > 1:
                    audio_data = np.mean(audio_data, axis=1)
                
                # Ensure minimum length for processing
                if len(audio_data) < 1000:  # Too short to process meaningfully
                    return jsonify({
                        "success": True,
                        "transcript": "",
                        "braille": "",
                        "language": "en",
                        "segments": [],
                        "braille_table": "en-us-g1.ctb"
                    })
                
            except Exception as audio_error:
                print(f"Audio loading error: {audio_error}")
                return jsonify({"error": f"Failed to load audio: {audio_error}"}), 500
            
            transcription_result = audio_processor.transcribe_audio(audio_data, sr)
            
            if not transcription_result['success']:
                return jsonify(transcription_result), 500
            
            # Translate to braille
            text = transcription_result['transcript']
            if not text or not text.strip():
                return jsonify({
                    "success": True,
                    "transcript": "",
                    "braille": "",
                    "language": transcription_result.get('language', 'en'),
                    "segments": transcription_result.get('segments', []),
                    "braille_table": "en-us-g1.ctb"
                })
            
            table = data.get('braille_table', 'en-us-g1.ctb')
            
            if table != braille_translator.table:
                braille_translator.table = table
            
            braille_result = braille_translator.text_to_braille(text)
            
            # Combine results
            result = {
                "success": True,
                "transcript": text,
                "braille": braille_result['braille'],
                "language": transcription_result.get('language', 'en'),
                "segments": transcription_result.get('segments', []),
                "braille_table": table
            }
            
            return jsonify(result)
        
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        print(f"Audio processing error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/process-video', methods=['POST'])
def process_video():
    """Process video file to generate timestamped braille subtitles"""
    try:
        data = request.get_json()
        
        if not data or 'video_path' not in data:
            return jsonify({"error": "No video path provided"}), 400
        
        video_path = data['video_path']
        
        # Handle relative paths from public folder
        if not os.path.isabs(video_path):
            # Convert public path to absolute path
            video_path = os.path.join(os.path.dirname(__file__), '..', 'public', video_path.lstrip('/'))
        
        if not os.path.exists(video_path):
            return jsonify({"error": f"Video file not found: {video_path}"}), 404
        
        try:
            import moviepy.editor as mp
            
            # Extract audio from video
            video_clip = mp.VideoFileClip(video_path)
            temp_audio_path = os.path.join(tempfile.gettempdir(), f"temp_audio_{int(time.time())}.wav")
            video_clip.audio.write_audiofile(temp_audio_path, verbose=False, logger=None)
            
            # Get video duration
            duration = video_clip.duration
            video_clip.close()
            
            # Process audio in 3-second chunks
            chunk_duration = 3.0  # 3 seconds per chunk
            subtitles = []
            
            print(f"Processing video: {os.path.basename(video_path)} (Duration: {duration:.2f} seconds)")
            
            # Load audio for Whisper
            import librosa
            audio_data, sr = librosa.load(temp_audio_path, sr=16000)
            
            num_chunks = int(duration / chunk_duration) + (1 if duration % chunk_duration > 0 else 0)
            
            for i in range(num_chunks):
                start_time = i * chunk_duration
                end_time = min((i + 1) * chunk_duration, duration)
                
                # Extract audio chunk
                start_sample = int(start_time * sr)
                end_sample = int(end_time * sr)
                chunk_audio = audio_data[start_sample:end_sample]
                
                if len(chunk_audio) > 0:
                    # Transcribe chunk
                    result = audio_processor.model.transcribe(chunk_audio, language="en", fp16=False)
                    
                    # Extract text safely
                    text = result.get("text", "")
                    if isinstance(text, str):
                        text = text.strip()
                    else:
                        text = str(text).strip() if text else ""
                    
                    if text:  # Only add if there's actual text
                        # Convert to braille
                        braille_result = braille_translator.text_to_braille(text)
                        
                        # Format timestamp
                        start_minutes = int(start_time // 60)
                        start_seconds = int(start_time % 60)
                        timestamp = f"{start_minutes:02d}:{start_seconds:02d}"
                        
                        subtitle = {
                            "id": f"subtitle_{i}",
                            "startTime": start_time,
                            "endTime": end_time,
                            "timestamp": timestamp,
                            "text": text,
                            "braille": braille_result['braille'],
                            "method": "enhanced-builtin-contractions"
                        }
                        subtitles.append(subtitle)
                        
                        print(f"Chunk {i+1}/{num_chunks}: {timestamp} - '{text[:50]}...' -> {len(braille_result['braille'])} braille chars")
            
            # Save subtitles to file
            video_filename = os.path.basename(video_path)
            subtitles_file = save_subtitles_to_file(subtitles, video_filename)
            
            print(f"✅ Preprocessing complete: {len(subtitles)} braille subtitle segments generated")
            
            return jsonify({
                "success": True,
                "subtitles": subtitles,
                "subtitle_file": subtitles_file,
                "duration": duration,
                "chunk_count": len(subtitles),
                "video_file": video_filename
            })
            
        finally:
            # Cleanup temp files
            if 'temp_audio_path' in locals() and os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
    
    except Exception as e:
        print(f"Video processing error: {e}")
        return jsonify({"error": str(e)}), 500


def save_subtitles_to_file(subtitles, video_filename):
    """Save subtitles to a JSON file with timestamps"""
    import json
    
    # Create subtitles directory if it doesn't exist
    subtitles_dir = os.path.join(os.path.dirname(__file__), '..', 'subtitles')
    os.makedirs(subtitles_dir, exist_ok=True)
    
    # Generate filename based on video name
    base_name = os.path.splitext(video_filename)[0]
    subtitle_filename = f"{base_name}_braille_subtitles.json"
    subtitle_path = os.path.join(subtitles_dir, subtitle_filename)
    
    # Save subtitles
    with open(subtitle_path, 'w', encoding='utf-8') as f:
        json.dump({
            "video_file": video_filename,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "chunk_duration": 3.0,
            "subtitles": subtitles
        }, f, indent=2, ensure_ascii=False)
    
    print(f"Saved subtitles to: {subtitle_path}")
    return subtitle_filename


if __name__ == '__main__':
    print("Starting Voice Learning Platform Python Backend...")
    print("Services: OpenAI Whisper + Built-in Grade 1 Braille")
    print("Endpoints:")
    print("  - POST /transcribe: Audio to text")
    print("  - POST /braille: Text to braille") 
    print("  - POST /process-audio: Audio to text + braille")
    print("  - POST /process-video: Video file to timestamped braille subtitles")
    print()
    
    # Start server
    app.run(host='0.0.0.0', port=5000, debug=True)