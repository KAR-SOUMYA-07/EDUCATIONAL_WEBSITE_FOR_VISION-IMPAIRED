#!/usr/bin/env python3
"""
Setup script for Voice Learning Platform Python Backend
Installs dependencies and starts the server
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🎤 Voice Learning Platform - Python Backend Setup")
    print("=" * 50)
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {python_version.major}.{python_version.minor}")
        return False
    
    print(f"✅ Python {python_version.major}.{python_version.minor} detected")
    
    # Install requirements
    requirements_path = "python-requirements.txt"
    if not os.path.exists(requirements_path):
        print(f"❌ Requirements file not found: {requirements_path}")
        return False
    
    # Install Python packages
    install_cmd = f"pip install -r {requirements_path}"
    if not run_command(install_cmd, "Installing Python dependencies"):
        print("\n💡 Tip: You might need to install pip or use pip3")
        print("💡 Try: python -m pip install -r python-requirements.txt")
        return False
    
    # Download Whisper models (optional)
    print("\n🔄 Downloading Whisper base model (this may take a few minutes)...")
    download_cmd = "python -c \"import whisper; whisper.load_model('base')\""
    if not run_command(download_cmd, "Downloading Whisper model"):
        print("⚠️  Whisper model download failed, but will be downloaded on first use")
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Start the Python backend: python python-backend/app.py")
    print("2. Start the React frontend: npm run dev")
    print("3. Open http://localhost:3001 and click the '⠃⠗⠇ OFF' button")
    print("\n📝 Requirements:")
    print("- Microphone access for audio capture")
    print("- Modern browser (Chrome/Edge recommended)")
    print("- Video with audio content")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)