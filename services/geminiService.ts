
import { GoogleGenAI, Type } from "@google/genai";
import { AIPlanResponse, RouteData } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async validateKey(): Promise<boolean> {
    try {
      // Small test call to validate key
      await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: 'Hi',
        config: { maxOutputTokens: 5 }
      });
      return true;
    } catch (error) {
      console.error("Key validation failed:", error);
      return false;
    }
  }

  async generatePlan(
    route: RouteData,
    preferences: string,
    history: string[] = []
  ): Promise<AIPlanResponse> {
    const prompt = `
      Plan a journey from ${route.origin} to ${route.destination}.
      Route Details: ${route.distanceKm}km, approx ${route.durationMin} mins.
      User Preferences: ${preferences}
      
      Previous Context: ${history.join('\n')}

      Provide a comprehensive travel plan including:
      1. A markdown summary of the journey.
      2. A structured day-by-day itinerary (if multiple days) or hourly (if one day).
      3. Budget estimates (Low, Medium, High).
      4. Potential risks or warnings.
      5. Specific transport tips for this specific route.
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyMarkdown: { type: Type.STRING },
            budgetEstimate: { type: Type.STRING },
            risks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            transportTips: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            itinerary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  activities: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING } 
                  }
                },
                required: ["day", "title", "activities"]
              }
            }
          },
          required: ["replyMarkdown", "itinerary", "budgetEstimate", "risks", "transportTips"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as AIPlanResponse;
  }
}
