/**
 * Utility script to set up the directory structure for MG Chatbot
 * 
 * This script creates the necessary directories for the chatbot to function.
 */

const fs = require('fs');
const path = require('path');

// Base directory
const baseDir = path.join(__dirname, '../..');

// Directories to create
const directories = [
  path.join(baseDir, 'data'),
  path.join(baseDir, 'data/json'),
  path.join(baseDir, 'data/embeddings'),
  path.join(baseDir, 'logs'),
  path.join(baseDir, 'config'),
];

// Function to create directories
function createDirectories() {
  console.log('Setting up directory structure...');
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error.message);
      }
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  });
  
  console.log('Directory setup complete!');
}

// Run the function
createDirectories();
