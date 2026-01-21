
import { AIPlanResponse, RouteData } from "../types";

export class AIService {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string = 'sk-vNp1LOoBxQLV94iE6cJt0gjYilA2nFiSlOOAYsC62Yxz0DPf', baseURL: string = 'https://claude.chiddns.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async validateKey(): Promise<boolean> {
    try {
      // Small test call to validate connection
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v3.1',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        })
      });

      return response.ok;
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
    const systemPrompt = `You are a professional travel planning assistant. Generate detailed, practical travel plans in JSON format.`;

    const userPrompt = `
Plan a journey from ${route.origin} to ${route.destination}.

Route Details:
- Distance: ${route.distanceKm} km
- Duration: ${Math.round(route.durationMin / 60)} hours (${route.durationMin} minutes)
- Route: ${route.summary}

User Preferences: ${preferences}

${history.length > 0 ? `Previous Conversation:\n${history.join('\n')}` : ''}

Provide a comprehensive travel plan in the following JSON format:
{
  "replyMarkdown": "A friendly markdown summary of the journey with key highlights",
  "budgetEstimate": "Estimated budget range (e.g., ¥800-1500 per person)",
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "transportTips": ["Tip 1", "Tip 2", "Tip 3"],
  "itinerary": [
    {
      "day": 1,
      "title": "Day title",
      "activities": ["Activity 1", "Activity 2"]
    }
  ]
}

Make the plan practical, detailed, and tailored to the route and preferences.`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v3.1',
          messages: [
            { role: 'user', content: systemPrompt + '\n\n' + userPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from AI");
      }

      const parsed = JSON.parse(content);

      // Ensure all required fields exist
      return {
        replyMarkdown: parsed.replyMarkdown || "Travel plan generated successfully!",
        budgetEstimate: parsed.budgetEstimate || "Budget varies by season",
        risks: parsed.risks || ["Check weather conditions", "Book accommodations in advance"],
        transportTips: parsed.transportTips || ["Arrive early", "Keep essentials handy"],
        itinerary: parsed.itinerary || []
      } as AIPlanResponse;

    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  }
}
