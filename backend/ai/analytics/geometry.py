from ai.contracts import Point


def point_in_polygon(point: Point, polygon: list[Point]) -> bool:
    if len(polygon) < 3:
        return False
    inside = False
    previous = polygon[-1]
    for current in polygon:
        crosses = (current.y > point.y) != (previous.y > point.y)
        if crosses:
            boundary_x = (previous.x - current.x) * (point.y - current.y) / (previous.y - current.y) + current.x
            if point.x < boundary_x:
                inside = not inside
        previous = current
    return inside


def line_side(point: Point, start: Point, end: Point) -> float:
    return (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x)