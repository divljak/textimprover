// Load environment variables from .env file
const path = require('path'); // Import path module
const envPath = path.join(__dirname, '.env'); // Construct path relative to this script
require('dotenv').config({ path: envPath }); // Specify the path for dotenv

// Import the Hugging Face Inference API client
const { HfInference } = require("@huggingface/inference");

// Check if the API token is loaded
const hfToken = process.env.HF_ACCESS_TOKEN;
if (!hfToken) {
  // Throw an error instead of exiting, so the main process might catch it
  throw new Error(`Hugging Face API token (HF_ACCESS_TOKEN) not configured or could not be loaded from ${envPath}.`);
}

// Initialize the Inference API client
const hf = new HfInference(hfToken);

// Define the instruction-following model
const instructionModel = 'mistralai/Mistral-7B-Instruct-v0.1'; // Using Mistral Instruct

// --- Text Improvement Function ---
async function improveText(inputText) {
  console.log(`Original Text (for improvement): "${inputText}"`);

  // Construct the prompt for the instruction model
  // Note: Mistral Instruct uses [INST] and [/INST] tags
  const prompt = `[INST] You are an AI assistant that improves writing. 
Fix spelling and grammar mistakes, enhance clarity, and adjust the tone to be professional and concise. 
Output *only* the improved text, without any explanations, apologies, or conversational filler like "Here is the improved text:".

Improve the following text:
${inputText} [/INST]`;

  try {
    const result = await hf.textGeneration({
      model: instructionModel,
      inputs: prompt,
      parameters: { 
        max_new_tokens: 250, 
        temperature: 0.8,    // Increase temperature slightly more
        top_p: 0.9,        
        top_k: 50,         // Add top_k sampling
        do_sample: true,     
        return_full_text: false, 
        use_cache: false   // Attempt to disable cache
      }
    });

    // Extract the generated text (assuming return_full_text=false)
    const improvedText = result.generated_text.trim();
    console.log(`Improved Text: "${improvedText}"`);
    return improvedText;

  } catch (error) {
    console.error(`Error calling Hugging Face API (${instructionModel}):`, error);
    // Check for specific model loading errors (common with large models on free tier)
    if (error.message && error.message.includes("is currently loading")) {
        console.error("Model is loading, please try again shortly.");
        // Optionally return a specific message or null
        return "Model is loading, please try again."; 
    }
    if (error.message && error.message.includes("Service Unavailable")) {
        console.error("Service unavailable, possibly due to model load or limits.");
        return "Improvement service temporarily unavailable.";
    }
    return null; // Indicate general failure
  }
}

// Remove old example calls and functions if they existed

// Export the new function
module.exports = { improveText }; 