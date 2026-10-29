"""Analytics exports loaded lazily to avoid an engine ↔ sweep import cycle."""
__all__ = ['SweepEngine', 'StatisticalBoundsEngine']


def __getattr__(name):
    if name == 'SweepEngine':
        from .sweep_engine import SweepEngine
        return SweepEngine
    if name == 'StatisticalBoundsEngine':
        from .statistical_bounds import StatisticalBoundsEngine
        return StatisticalBoundsEngine
    raise AttributeError(name)
