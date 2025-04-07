// Load environment variables from .env file
require('dotenv').config();

// Import the Hugging Face Inference API client
const { HfInference } = require("@huggingface/inference");

// Check if the API token is loaded
const hfToken = process.env.HF_ACCESS_TOKEN;
if (!hfToken) {
  console.error("Error: Hugging Face API token not found.");
  console.error("Please create a .env file with HF_ACCESS_TOKEN=<your-token>");
  process.exit(1); // Exit if the token is missing
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
      parameters: { // Optional parameters for tuning
        max_new_tokens: 250, // Limit the length of the generated improvement
        temperature: 0.7,    // Balance creativity and determinism
        top_p: 0.9,        // Nucleus sampling
        do_sample: true,     // Ensure sampling is enabled for temperature/top_p
        return_full_text: false // Important: Only return the generated part
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