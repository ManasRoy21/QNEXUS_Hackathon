"""Owner-only IBM SamplerV2 jobs. Never replace hardware failures with simulation."""
from importlib.util import find_spec
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from app.core.config import settings
from app.engine.quantum.bell_lab import bell_circuits, analyze_counts
from app.schemas.quantum_lab import BellRequest

TAG = 'qnexus-chsh-v1'


def hardware_status():
    configured = bool(settings.IBM_QUANTUM_ENABLED and settings.IBM_QUANTUM_API_KEY
                      and settings.IBM_QUANTUM_INSTANCE and settings.IBM_QUANTUM_BACKEND
                      and settings.QUANTUM_OPERATOR_TOKEN and find_spec('qiskit_ibm_runtime'))
    return dict(available=configured, execution='ibm_quantum_hardware',
                backend=settings.IBM_QUANTUM_BACKEND if configured else None,
                experiment='CHSH Bell-pair witness', requires_operator=True,
                explanation='Hardware access is configured. Submission requires the operator password and explicit quota acknowledgement.' if configured
                else 'The owner must configure IBM Quantum access, a backend and an operator password. No hardware results have been generated.',
                scope='Two qubits on one QPU. Not a bank-to-bank quantum link or a loophole-free Bell test.')


def runtime_service():
    from qiskit_ibm_runtime import QiskitRuntimeService
    return QiskitRuntimeService(channel='ibm_quantum_platform',
        token=settings.IBM_QUANTUM_API_KEY.get_secret_value(), instance=settings.IBM_QUANTUM_INSTANCE)


def submit_bell(shots):
    from qiskit_ibm_runtime import SamplerV2
    service = runtime_service()
    backend = service.backend(settings.IBM_QUANTUM_BACKEND)
    if backend.configuration().simulator or not backend.status().operational:
        raise ValueError('The configured backend must be an operational physical QPU.')
    circuits = bell_circuits(BellRequest(noise=0, interception=0))
    isa = generate_preset_pass_manager(backend=backend, optimization_level=1).run(circuits)
    sampler = SamplerV2(mode=backend)
    sampler.options.environment.job_tags = [TAG]
    sampler.options.max_execution_time = 60
    job = sampler.run(isa, shots=shots)
    return dict(job_id=job.job_id(), status=str(job.status()), backend=backend.name,
                execution='ibm_quantum_hardware', settings=4, shots_per_setting=shots,
                explanation='Submitted to IBM Quantum. Queue and execution times depend on your account and the processor.')


def get_bell_job(identifier):
    job = runtime_service().job(identifier)
    if TAG not in (job.tags or []) or job.backend().name != settings.IBM_QUANTUM_BACKEND:
        raise LookupError('This is not a QNexus Bell job on the configured backend.')
    status = str(job.status())
    response = dict(job_id=job.job_id(), status=status, backend=job.backend().name,
                    execution='ibm_quantum_hardware', result=None)
    if status == 'DONE':
        results = job.result(timeout=20)
        response['result'] = analyze_counts([pub.data.meas.get_counts() for pub in results])
    elif status in ('ERROR', 'CANCELLED'):
        response['explanation'] = 'IBM Quantum did not complete this job. Inspect the job in your IBM dashboard.'
    return response
