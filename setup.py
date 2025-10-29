#!/usr/bin/env python3
"""
Voice-Controlled Learning Platform - React Web Application Setup

This project has been converted from Python to a modern React web application
using TypeScript, Reshaped UI, and the Web Speech API.

For setup and installation, please refer to the README.md file.
The application now runs in a web browser instead of as a desktop application.
"""

import subprocess
import sys
import os
import json

def check_node_npm():
    """Check if Node.js and npm are installed"""
    try:
        node_result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        npm_result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        
        if node_result.returncode == 0 and npm_result.returncode == 0:
            print(f"✅ Node.js: {node_result.stdout.strip()}")
            print(f"✅ npm: {npm_result.stdout.strip()}")
            return True
        else:
            return False
    except FileNotFoundError:
        return False

def setup_react_app():
    """Set up the React application"""
    print("🎤 Voice-Controlled Learning Platform Setup")
    print("=" * 50)
    print()
    
    # Check Node.js and npm
    if not check_node_npm():
        print("❌ Node.js and/or npm not found!")
        print("\nPlease install Node.js 16+ from: https://nodejs.org/")
        print("This will include npm automatically.")
        return False
    
    # Check if package.json exists
    if not os.path.exists('package.json'):
        print("❌ package.json not found!")
        print("Make sure you're in the correct directory.")
        return False
    
    print("\n📦 Installing dependencies...")
    try:
        # Install npm dependencies
        result = subprocess.run(['npm', 'install'], check=True)
        print("✅ Dependencies installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False
    
    # Check for video file
    video_path = os.path.join("public", "assets", "videos", "web-dev-intro.mp4")
    if os.path.exists(video_path):
        print(f"✅ Video file found: {video_path}")
    else:
        print(f"⚠️  Video file not found at {video_path}")
        print("   The application will still work, but you may need to add video content.")
    
    print("\n🚀 Setup complete!")
    print("\nTo start the development server:")
    print("   npm run dev")
    print("\nThen open: http://localhost:3000")
    print("\n📚 Features:")
    print("   ✅ Voice control with spacebar activation")
    print("   ✅ Accessible video player")
    print("   ✅ Screen reader support") 
    print("   ✅ Modern React + TypeScript")
    print("   ✅ Reshaped UI components")
    
    return True

if __name__ == "__main__":
    setup_react_app()