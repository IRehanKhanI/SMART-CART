from dataclasses import dataclass

from ai.analytics.geometry import point_in_polygon
from ai.contracts import Detection, Point


@dataclass(frozen=True)
class ShelfRegion:
    name: str
    polygon: list[Point]
    expected_facings: int


def analyze_shelf(region: ShelfRegion, products: list[Detection]) -> dict:
    detected = sum(point_in_polygon(product.bottom_center, region.polygon) for product in products)
    expected = max(region.expected_facings, 1)
    stock_percent = min(round(detected / expected * 100, 1), 100.0)
    return {"name": region.name, "detected": detected, "emptySlots": max(region.expected_facings - detected, 0), "stockPercent": stock_percent}