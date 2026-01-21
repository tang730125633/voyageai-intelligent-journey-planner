
export interface RouteData {
  origin: string;
  destination: string;
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
  summary: string;
}

export interface PlanItem {
  day: number;
  title: string;
  activities: string[];
}

export interface AIPlanResponse {
  replyMarkdown: string;
  itinerary: PlanItem[];
  budgetEstimate: string;
  risks: string[];
  transportTips: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface HistoryRecord {
  id: string;
  origin: string;
  destination: string;
  timestamp: number;
  routeSummary: string;
  aiResponse: AIPlanResponse;
}
