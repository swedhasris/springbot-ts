import { GoogleGenAI } from "@google/genai";
import { config as loadEnv } from "dotenv";

loadEnv();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Using API Key:", apiKey);
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello",
    });
    console.log("SUCCESS:", result.text);
  } catch (err: any) {
    console.error("FAILED:", err.message);
    if (err.stack) console.error(err.stack);
  }
}

test();
