import "dotenv/config"; // Paksa baca .env sebelum inisialisasi AI
import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
