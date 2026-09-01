import numpy as np

from ai.contracts import TrackedObject


class HeatmapAccumulator:
    def __init__(self, rows: int = 24, columns: int = 32) -> None:
        self.grid = np.zeros((rows, columns), dtype=np.uint32)

    def update(self, tracks: list[TrackedObject]) -> None:
        rows, columns = self.grid.shape
        for track in tracks:
            point = track.detection.bottom_center
            column = min(max(int(point.x * columns), 0), columns - 1)
            row = min(max(int(point.y * rows), 0), rows - 1)
            self.grid[row, column] += 1

    def snapshot(self) -> list[list[int]]:
        return self.grid.tolist()