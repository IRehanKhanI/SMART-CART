from dataclasses import dataclass


@dataclass(frozen=True)
class QueueForecast:
    current_length: int
    projected_length: float
    growth_per_minute: float
    risk: str
    horizon_minutes: int


class QueueRiskEstimator:
    """Observed-rate baseline used until sufficient local data exists for training."""

    def __init__(self, horizon_minutes: int = 5) -> None:
        self.horizon_minutes = horizon_minutes

    def predict(self, current_length: int, growth_per_minute: float, capacity: int) -> QueueForecast:
        projected = max(current_length + growth_per_minute * self.horizon_minutes, 0)
        ratio = projected / max(capacity, 1)
        risk = "CRITICAL" if ratio >= 1.25 else "HIGH" if ratio >= 1 else "MEDIUM" if ratio >= 0.65 else "LOW"
        return QueueForecast(current_length, round(projected, 1), round(growth_per_minute, 2), risk, self.horizon_minutes)