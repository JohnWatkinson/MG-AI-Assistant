#!/usr/bin/env python3
"""
MaisonGuida AI Assistant Runner Script

This script helps manage the MaisonGuida AI Assistant by:
1. Starting the backend server
2. Starting the frontend development server
3. Setting environment variables correctly
4. Providing command-line options for customization

Usage:
    python run_chatbot.py [options]

Options:
    --backend-only     Start only the backend server
    --frontend-only    Start only the frontend server
    --port-backend=N   Set backend server port (default: 3002)
    --port-frontend=N  Set frontend server port (default: 3001)
    --dev              Run in development mode (default)
    --prod             Run in production mode
    --debug            Enable debug logging
"""

import os
import sys
import signal
import subprocess
import argparse
import time
import json
import logging
from pathlib import Path

# Check if running in the correct virtual environment
def check_venv():
    venv_dir = Path(__file__).parent / "venv"
    if venv_dir.exists():
        venv_python = venv_dir / "bin" / "python"
        if venv_python.exists():
            # Get the current Python interpreter path
            current_python = sys.executable
            venv_python_str = str(venv_python.resolve())
            
            if current_python != venv_python_str:
                print(f"⚠️  Warning: You are not using the project's virtual environment Python.")
                print(f"   Current Python: {current_python}")
                print(f"   Expected Python: {venv_python_str}")
                print(f"   To fix this, run: source ./fix_venv.sh")
                print(f"   Then run this script again.\n")
                
                # Continue anyway, just with a warning
                return False
    return True

# Run the venv check (but don't exit if it fails)
check_venv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('chatbot-runner')

# Global variables to track processes
processes = []

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='MaisonGuida AI Assistant Runner')
    
    # Service selection
    parser.add_argument('--backend-only', action='store_true', help='Start only the backend server')
    parser.add_argument('--frontend-only', action='store_true', help='Start only the frontend server')
    
    # Port configuration
    parser.add_argument('--port-backend', type=int, default=3002, help='Backend server port (default: 3002)')
    parser.add_argument('--port-frontend', type=int, default=3001, help='Frontend server port (default: 3001)')
    
    # Environment
    parser.add_argument('--dev', action='store_true', default=True, help='Run in development mode (default)')
    parser.add_argument('--prod', action='store_false', dest='dev', help='Run in production mode')
    
    # Debugging
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    
    return parser.parse_args()

def setup_environment(args):
    """Set up environment variables."""
    env = os.environ.copy()
    
    # Load environment variables from .env file if it exists
    dotenv_path = Path(__file__).parent / ".env"
    if dotenv_path.exists():
        logger.info("Loading environment variables from .env file")
        try:
            with open(dotenv_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env[key.strip()] = value.strip().strip('"\'')
            logger.info("Successfully loaded environment variables from .env file")
        except Exception as e:
            logger.warning(f"Error loading .env file: {e}")
    
    # Set environment mode
    env['NODE_ENV'] = 'development' if args.dev else 'production'
    
    # Set ports
    env['PORT'] = str(args.port_backend)
    env['REACT_APP_BACKEND_PORT'] = str(args.port_backend)
    env['PORT_FRONTEND'] = str(args.port_frontend)
    
    # Set debug level
    if args.debug:
        env['DEBUG'] = '*'
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    return env

def start_backend(args, env):
    """Start the backend server."""
    logger.info("Starting backend server...")
    
    backend_cmd = ["node", "src/server.js"]
    backend_process = subprocess.Popen(
        backend_cmd,
        env=env,
        cwd=str(Path(__file__).parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    processes.append(backend_process)
    logger.info(f"Backend server started on port {args.port_backend}")
    
    # Start a thread to read and log output
    def log_output(process, name):
        for line in iter(process.stdout.readline, ''):
            logger.info(f"[{name}] {line.strip()}")
    
    import threading
    threading.Thread(target=log_output, args=(backend_process, "BACKEND"), daemon=True).start()
    
    return backend_process

def start_frontend(args, env):
    """Start the frontend development server."""
    logger.info("Starting frontend server...")
    
    # Set environment variables for React app
    env['PORT'] = str(args.port_frontend)
    
    frontend_cmd = ["npm", "start"]
    frontend_process = subprocess.Popen(
        frontend_cmd,
        env=env,
        cwd=str(Path(__file__).parent / "chatbot-ui"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    processes.append(frontend_process)
    logger.info(f"Frontend server started on port {args.port_frontend}")
    
    # Start a thread to read and log output
    def log_output(process, name):
        for line in iter(process.stdout.readline, ''):
            logger.info(f"[{name}] {line.strip()}")
    
    import threading
    threading.Thread(target=log_output, args=(frontend_process, "FRONTEND"), daemon=True).start()
    
    return frontend_process

def cleanup(signum=None, frame=None):
    """Clean up processes on exit."""
    logger.info("Shutting down services...")
    
    for process in processes:
        if process.poll() is None:  # If process is still running
            process.terminate()
            logger.debug(f"Terminated process PID {process.pid}")
    
    # Give processes time to terminate gracefully
    time.sleep(1)
    
    # Force kill any remaining processes
    for process in processes:
        if process.poll() is None:
            process.kill()
            logger.debug(f"Killed process PID {process.pid}")
    
    logger.info("All services shut down")
    sys.exit(0)

def main():
    """Main entry point."""
    args = parse_arguments()
    env = setup_environment(args)
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    try:
        # Start services based on arguments
        if not args.frontend_only:
            backend_process = start_backend(args, env)
        
        if not args.backend_only:
            # Give the backend a moment to start
            if not args.frontend_only:
                time.sleep(2)
            frontend_process = start_frontend(args, env)
        
        # Print access information
        if not args.frontend_only:
            logger.info(f"Backend API available at: http://localhost:{args.port_backend}")
        
        if not args.backend_only:
            logger.info(f"Frontend UI available at: http://localhost:{args.port_frontend}")
        
        logger.info("Press Ctrl+C to stop all services")
        
        # Keep the script running
        while True:
            time.sleep(1)
            
            # Check if processes are still running
            for process in list(processes):
                if process.poll() is not None:
                    logger.error(f"Process exited with code {process.poll()}")
                    processes.remove(process)
            
            if not processes:
                logger.error("All processes have exited")
                break
                
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    finally:
        cleanup()

if __name__ == "__main__":
    main()
