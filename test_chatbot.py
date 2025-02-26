#!/usr/bin/env python3
"""
MaisonGuida AI Assistant Test Script

This script tests the chatbot API by sending a test message and displaying the response.
It's useful for verifying that the backend is working correctly without needing to start the frontend.

Usage:
    python test_chatbot.py [options]

Options:
    --port=N     Backend server port (default: 3002)
    --message=S  Test message to send (default: "Tell me about your dresses")
"""

import argparse
import requests
import json
import time
import sys

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Test the MaisonGuida AI Assistant')
    parser.add_argument('--port', type=int, default=3002, help='Backend server port (default: 3002)')
    parser.add_argument('--message', type=str, default="Tell me about your dresses", 
                        help='Test message to send (default: "Tell me about your dresses")')
    return parser.parse_args()

def test_chatbot(port, message):
    """Test the chatbot API."""
    url = f"http://localhost:{port}/api/chat"
    
    print(f"Testing chatbot API at {url}")
    print(f"Sending message: '{message}'")
    print("-" * 50)
    
    try:
        start_time = time.time()
        response = requests.post(
            url,
            json={"message": message},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        end_time = time.time()
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Chatbot response received successfully!")
            print(f"⏱️  Response time: {data.get('processingTime', end_time - start_time):.2f}ms")
            print("-" * 50)
            print(f"📝 Response: {data.get('reply', 'No reply content')}")
            print("-" * 50)
            return True
        else:
            print(f"\n❌ Error: Received status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection error: Could not connect to the backend server")
        print("Make sure the backend server is running on the specified port")
        return False
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False

def main():
    """Main entry point."""
    args = parse_arguments()
    
    print("\n🤖 MaisonGuida AI Assistant Test")
    print("-" * 50)
    
    success = test_chatbot(args.port, args.message)
    
    if success:
        print("\n✨ Test completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
