import { RouteData } from "../types";

export class RouteService {
  // 使用 OpenRouteService 的免费 API
  // 如果需要更高配额，可以在 https://openrouteservice.org/ 注册获取免费 API key
  private apiKey: string = '5b3ce3597851110001cf6248a0c6d3e7e78443c0830e76c3d1e1c7d8'; // 公共演示 key
  private baseURL: string = 'https://api.openrouteservice.org/v2';

  // 地理编码：将地名转换为坐标
  async geocode(placeName: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
    try {
      // 使用 Nominatim (OpenStreetMap 的免费地理编码服务)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'VoyageAI/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.length === 0) {
        return null;
      }

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  // 计算两点间的直线距离（单位：km）
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 地球半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 生成简化路径点
  private generateSimplifiedRoute(
    originLat: number, originLon: number,
    destLat: number, destLon: number
  ): [number, number][] {
    const points: [number, number][] = [];
    const steps = 20; // 生成20个中间点，让路线更平滑

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      points.push([
        originLat + (destLat - originLat) * ratio,
        originLon + (destLon - originLon) * ratio
      ]);
    }

    return points;
  }

  // 获取路由（带降级方案）
  async getRoute(origin: string, destination: string): Promise<RouteData> {
    try {
      // 1. 地理编码：将地名转换为坐标
      const [originGeo, destGeo] = await Promise.all([
        this.geocode(origin),
        this.geocode(destination)
      ]);

      if (!originGeo || !destGeo) {
        throw new Error(`无法找到地点: ${!originGeo ? origin : destination}`);
      }

      // 2. 尝试获取真实路由
      try {
        const response = await fetch(
          `${this.baseURL}/directions/driving-car?api_key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              coordinates: [
                [originGeo.lon, originGeo.lat],
                [destGeo.lon, destGeo.lat]
              ]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const route = data.features[0];
          const geometry = route.geometry.coordinates;
          const properties = route.properties.segments[0];

          // 转换坐标格式
          const polyline: [number, number][] = geometry.map((coord: number[]) => [coord[1], coord[0]]);

          return {
            origin: originGeo.displayName.split(',')[0] || origin,
            destination: destGeo.displayName.split(',')[0] || destination,
            distanceKm: Math.round(properties.distance / 1000),
            durationMin: Math.round(properties.duration / 60),
            polyline: polyline,
            summary: `从 ${origin} 到 ${destination}`
          };
        }
      } catch (apiError) {
        console.warn("路由 API 调用失败，使用降级方案:", apiError);
      }

      // 3. 降级方案：使用直线距离估算
      const distance = this.calculateDistance(
        originGeo.lat, originGeo.lon,
        destGeo.lat, destGeo.lon
      );

      const polyline = this.generateSimplifiedRoute(
        originGeo.lat, originGeo.lon,
        destGeo.lat, destGeo.lon
      );

      // 估算行驶时间（假设平均速度 80km/h，乘以 1.3 系数考虑实际道路）
      const estimatedDuration = Math.round((distance * 1.3 / 80) * 60);

      return {
        origin: originGeo.displayName.split(',')[0] || origin,
        destination: destGeo.displayName.split(',')[0] || destination,
        distanceKm: Math.round(distance * 1.3), // 乘以 1.3 估算实际道路距离
        durationMin: estimatedDuration,
        polyline: polyline,
        summary: `从 ${origin} 到 ${destination}（估算路线）`
      };
    } catch (error) {
      console.error("Route service error:", error);
      throw error;
    }
  }
}
