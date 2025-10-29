#!/usr/bin/env python3
"""
Video Preprocessing Script
Processes video file to generate braille subtitles with timestamps
Saves to JSON file for later use during video playback
"""

import os
import json
import time
import sys
import tempfile
from pathlib import Path

# Add python-backend to path to import our modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'python-backend'))

from app import EnhancedBrailleTranslator, AudioProcessor

def preprocess_video_to_braille(video_path, output_file=None, chunk_duration=3.0):
    """
    Preprocess video file and generate timestamped braille subtitles
    
    Args:
        video_path (str): Path to video file
        output_file (str): Output JSON file path (optional)
        chunk_duration (float): Duration of each chunk in seconds
    """
    
    print("🎬 Video Preprocessing Script")
    print("="*50)
    
    # Initialize processors
    print("Loading Whisper model...")
    audio_processor = AudioProcessor()
    
    print("Initializing braille translator...")
    braille_translator = EnhancedBrailleTranslator()
    
    # Check if video exists
    if not os.path.exists(video_path):
        print(f"❌ Video file not found: {video_path}")
        return False
    
    print(f"📹 Processing video: {os.path.basename(video_path)}")
    
    try:
        import moviepy.editor as mp
        import librosa
        
        # Extract audio from video
        print("🎵 Extracting audio from video...")
        video_clip = mp.VideoFileClip(video_path)
        temp_audio_path = os.path.join(tempfile.gettempdir(), f"temp_audio_{int(time.time())}.wav")
        video_clip.audio.write_audiofile(temp_audio_path, verbose=False, logger=None)
        
        # Get video duration
        duration = video_clip.duration
        video_clip.close()
        
        print(f"⏱️ Video duration: {duration:.1f} seconds")
        print(f"📦 Chunk duration: {chunk_duration} seconds")
        
        # Load audio for Whisper
        print("🎧 Loading audio for Whisper...")
        audio_data, sr = librosa.load(temp_audio_path, sr=16000)
        
        num_chunks = int(duration / chunk_duration) + (1 if duration % chunk_duration > 0 else 0)
        print(f"🔢 Total chunks to process: {num_chunks}")
        
        subtitles = []
        
        # Process each chunk
        for i in range(num_chunks):
            start_time = i * chunk_duration
            end_time = min((i + 1) * chunk_duration, duration)
            
            print(f"\n🔄 Processing chunk {i+1}/{num_chunks}: {start_time:.1f}s - {end_time:.1f}s")
            
            # Extract audio chunk
            start_sample = int(start_time * sr)
            end_sample = int(end_time * sr)
            chunk_audio = audio_data[start_sample:end_sample]
            
            if len(chunk_audio) > 0:
                # Transcribe chunk
                print("  🎤 Transcribing with Whisper...")
                result = audio_processor.model.transcribe(chunk_audio, language="en", fp16=False)
                
                # Extract text safely
                text = result.get("text", "")
                if isinstance(text, str):
                    text = text.strip()
                else:
                    text = str(text).strip() if text else ""
                
                if text:  # Only add if there's actual text
                    print(f"  📝 Text: '{text}'")
                    
                    # Convert to braille
                    print("  ⠃ Converting to braille...")
                    braille_text = braille_translator.text_to_braille_enhanced(text)
                    
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
                        "braille": braille_text,
                        "method": "enhanced-builtin-contractions"
                    }
                    subtitles.append(subtitle)
                    
                    print(f"  ⠃⠗⠁⠊⠇⠇⠑: '{braille_text}'")
                    print(f"  ✅ Chunk processed successfully")
                else:
                    print("  ⏭️ No speech detected in chunk")
        
        # Generate output filename if not provided
        if not output_file:
            video_name = Path(video_path).stem
            output_file = f"{video_name}_braille_subtitles.json"
        
        # Prepare subtitle data
        subtitle_data = {
            "video_file": os.path.basename(video_path),
            "video_duration": duration,
            "chunk_duration": chunk_duration,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_segments": len(subtitles),
            "braille_method": "enhanced-builtin-contractions",
            "subtitles": subtitles
        }
        
        # Save to JSON file
        print(f"\n💾 Saving braille subtitles to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(subtitle_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Preprocessing completed successfully!")
        print(f"📊 Statistics:")
        print(f"   - Total segments: {len(subtitles)}")
        print(f"   - Video duration: {duration:.1f}s")
        print(f"   - Coverage: {sum(s['endTime'] - s['startTime'] for s in subtitles):.1f}s")
        print(f"   - Braille file: {output_file}")
        
        # Cleanup
        if os.path.exists(temp_audio_path):
            os.unlink(temp_audio_path)
        
        return True
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Install required packages: pip install moviepy librosa")
        return False
    except Exception as e:
        print(f"❌ Processing error: {e}")
        return False

def main():
    """Main function"""
    
    # Default video path
    video_path = os.path.join("public", "assets", "videos", "web-dev-intro.mp4")
    
    # Check if video exists
    if not os.path.exists(video_path):
        print(f"❌ Video file not found: {video_path}")
        print("Place your video file in public/assets/videos/")
        return
    
    # Start preprocessing
    success = preprocess_video_to_braille(
        video_path=video_path,
        output_file="web-dev-intro_braille_subtitles.json",
        chunk_duration=3.0
    )
    
    if success:
        print("\n🎉 Video preprocessing completed!")
        print("📱 You can now use the braille subtitle file in the web application")
    else:
        print("\n💥 Preprocessing failed!")

if __name__ == "__main__":
    main()