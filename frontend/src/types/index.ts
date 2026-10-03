export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type HealthStatus = {
  status: "ok";
  service: string;
};
