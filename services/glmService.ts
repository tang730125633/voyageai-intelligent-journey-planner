import { AIPlanResponse, RouteData } from "../types";

export class GLMService {
  private apiKey: string;
  // 开发环境使用代理，生产环境直接调用 API
  private baseURL: string = import.meta.env.PROD
    ? 'https://open.bigmodel.cn/api/paas/v4'
    : '/api/glm';

  constructor(apiKey: string = '0a0620e8b7394690b2945f3dc3dca502.xghC4HTyFgWFKZbx') {
    this.apiKey = apiKey;
  }

  async validateKey(): Promise<boolean> {
    try {
      console.log('[GLM] 验证 API Key...');
      console.log('[GLM] Base URL:', this.baseURL);
      console.log('[GLM] API Key 前8位:', this.apiKey.substring(0, 8));

      // Small test call to validate connection
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GLM] 验证失败:', response.status, errorText);
        return false;
      }

      console.log('[GLM] ✅ 验证成功');
      return true;
    } catch (error) {
      console.error("[GLM] Key validation failed:", error);
      return false;
    }
  }

  async generatePlan(
    route: RouteData,
    preferences: string,
    history: string[] = []
  ): Promise<AIPlanResponse> {
    const systemPrompt = `你是一个专业的旅行规划助手。请用中文生成详细、实用的旅行计划，并以 JSON 格式返回。`;

    const userPrompt = `
请为从 ${route.origin} 到 ${route.destination} 的旅程制定计划。

路线详情：
- 距离：${route.distanceKm} 公里
- 预计时长：${Math.round(route.durationMin / 60)} 小时（${route.durationMin} 分钟）
- 路线：${route.summary}

用户偏好：${preferences}

${history.length > 0 ? `历史对话：\n${history.join('\n')}` : ''}

请提供一个全面的旅行计划，使用以下 JSON 格式：
{
  "replyMarkdown": "友好的旅程摘要（Markdown 格式），包含主要亮点",
  "budgetEstimate": "预算范围估算（例如：¥800-1500/人）",
  "risks": ["风险提示1", "风险提示2", "风险提示3"],
  "transportTips": ["交通建议1", "交通建议2", "交通建议3"],
  "itinerary": [
    {
      "day": 1,
      "title": "第一天标题",
      "activities": ["活动1", "活动2"]
    }
  ]
}

请确保计划实用、详细，并针对具体路线和偏好定制。`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            { role: 'user', content: systemPrompt + '\n\n' + userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000  // 增加输出长度限制
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      console.log('[GLM] 响应长度:', content?.length, '字符');
      console.log('[GLM] finish_reason:', data.choices[0]?.finish_reason);

      if (!content) {
        throw new Error("No response from AI");
      }

      // 尝试解析 JSON（GLM 可能会返回带代码块的 JSON）
      let parsed;
      try {
        // 移除可能的 markdown 代码块标记
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanContent);
      } catch (parseError) {
        console.warn("JSON 解析失败，尝试提取 JSON:", parseError);
        // 尝试从文本中提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("无法解析 AI 返回的内容");
        }
      }

      // Ensure all required fields exist
      return {
        replyMarkdown: parsed.replyMarkdown || "旅行计划生成成功！",
        budgetEstimate: parsed.budgetEstimate || "预算因季节而异",
        risks: parsed.risks || ["注意天气变化", "提前预订住宿"],
        transportTips: parsed.transportTips || ["提前到达", "随身携带必需品"],
        itinerary: parsed.itinerary || []
      } as AIPlanResponse;

    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  }
}
