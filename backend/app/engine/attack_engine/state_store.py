"""Canonical simulation store persisted in SQLite across API restarts."""
from app.schemas.canonical_models import CanonicalSimulationState
from app.storage.repository import repository


def save(state):
    repository().save_state(state)


def get(simulation_id):
    payload = repository().get_state(simulation_id)
    return CanonicalSimulationState.model_validate(payload) if payload else None


def require(simulation_id):
    state = get(simulation_id)
    if state is None:
        raise LookupError(f"No simulation state found for simulation_id='{simulation_id}'. Run POST /api/v1/simulation/generate-material first.")
    return state


def delete(simulation_id):
    with repository().connect() as db:
        return db.execute('DELETE FROM simulations WHERE id=?', (simulation_id,)).rowcount > 0


def list_ids():
    with repository().connect() as db:
        return [row['id'] for row in db.execute('SELECT id FROM simulations ORDER BY created DESC, id DESC')]


def clear():
    with repository().connect() as db:
        db.execute('DELETE FROM simulations')
