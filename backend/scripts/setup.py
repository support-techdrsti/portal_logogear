#!/usr/bin/env python3
"""
Setup script to install required Python packages for DC generation
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required Python packages"""
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        requirements_file = os.path.join(script_dir, 'requirements.txt')
        
        print("Installing Python dependencies...")
        
        # Install packages
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', requirements_file
        ])
        
        print("✅ Python dependencies installed successfully!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = install_requirements()
    sys.exit(0 if success else 1)