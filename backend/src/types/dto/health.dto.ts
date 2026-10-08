export interface HealthDto {
  status: "ok" | "degraded"
  uptime: number
  timestamp: string
  database: "up" | "down"
}
