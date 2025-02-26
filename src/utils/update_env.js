/**
 * Utility script to update or create .env file
 * 
 * This script helps set up the environment variables needed for the MG Chatbot.
 * It will create a .env file if it doesn't exist, or update an existing one.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to .env file
const envPath = path.join(__dirname, '../../.env');

// Default environment variables
const defaultEnv = {
  NODE_ENV: 'development',
  PORT: '3002',
  OPENAI_API_KEY: '',
};

// Function to read existing .env file
function readEnvFile() {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();
          if (key) {
            envVars[key.trim()] = value.replace(/^["'](.*)["']$/, '$1'); // Remove quotes if present
          }
        }
      });
      
      return envVars;
    }
  } catch (error) {
    console.error('Error reading .env file:', error.message);
  }
  
  return {};
}

// Function to write to .env file
function writeEnvFile(envVars) {
  try {
    let content = '';
    
    for (const [key, value] of Object.entries(envVars)) {
      content += `${key}=${value}\n`;
    }
    
    fs.writeFileSync(envPath, content);
    console.log(`.env file updated at ${envPath}`);
  } catch (error) {
    console.error('Error writing .env file:', error.message);
  }
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main function
async function main() {
  console.log('MG Chatbot Environment Setup');
  console.log('============================');
  
  // Read existing .env file
  const existingEnv = readEnvFile();
  const newEnv = { ...defaultEnv, ...existingEnv };
  
  // Ask for OpenAI API key if not set
  if (!newEnv.OPENAI_API_KEY) {
    console.log('\nOpenAI API Key is required for the chatbot to function.');
    console.log('You can get an API key from https://platform.openai.com/api-keys');
    
    const apiKey = await new Promise(resolve => {
      rl.question('Enter your OpenAI API Key: ', answer => {
        resolve(answer.trim());
      });
    });
    
    if (apiKey) {
      newEnv.OPENAI_API_KEY = apiKey;
    } else {
      console.log('Warning: No API key provided. The chatbot will not function without it.');
    }
  }
  
  // Ask for port
  const port = await new Promise(resolve => {
    rl.question(`Enter server port (default: ${newEnv.PORT}): `, answer => {
      resolve(answer.trim() || newEnv.PORT);
    });
  });
  
  newEnv.PORT = port;
  
  // Ask for environment
  const env = await new Promise(resolve => {
    rl.question(`Enter environment (development/production) (default: ${newEnv.NODE_ENV}): `, answer => {
      const input = answer.trim().toLowerCase();
      if (input === 'production' || input === 'development') {
        resolve(input);
      } else {
        resolve(newEnv.NODE_ENV);
      }
    });
  });
  
  newEnv.NODE_ENV = env;
  
  // Write the updated .env file
  writeEnvFile(newEnv);
  
  console.log('\nEnvironment setup complete!');
  console.log('You can manually edit the .env file at any time to update these values.');
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
