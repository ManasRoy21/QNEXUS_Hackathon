import matplotlib.pyplot as plt
from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
from qiskit_aer import AerSimulator

def build_bell_teleportation_circuit(state_prep: str = '+') -> QuantumCircuit:
    qr = QuantumRegister(3, name="q")
    cr_alice = ClassicalRegister(2, name="c_alice")
    cr_bob = ClassicalRegister(1, name="c_bob")
    qc = QuantumCircuit(qr, cr_alice, cr_bob)

    # 1. State Preparation
    if state_prep == '+':
        qc.h(qr[0])

    qc.barrier()

    # 2. Bell Pair Generation
    qc.h(qr[1])
    qc.cx(qr[1], qr[2])

    qc.barrier()

    # 3. Teleportation
    qc.cx(qr[0], qr[1])
    qc.h(qr[0])
    qc.measure([qr[0], qr[1]], cr_alice)

    qc.barrier()

    # 4. Conditional Corrections
    with qc.if_test((cr_alice[0], 1)):
        qc.z(qr[2])
    with qc.if_test((cr_alice[1], 1)):
        qc.x(qr[2])

    qc.barrier()

    # 5. Verification
    if state_prep in ['+', '-']:
        qc.h(qr[2])
    qc.measure(qr[2], cr_bob)

    return qc

if __name__ == "__main__":
    circuit = build_bell_teleportation_circuit(state_prep='+')

    # Graphical Matplotlib Output Render Kara
    fig = circuit.draw(output='mpl', style='iqp')
    
    # Diagram Pop-up Window madhye Dakhavnyasathi:
    plt.show()
    
    # High-quality Image file mhanun save karnya sathi:
    # fig.savefig("bell_circuit.png", dpi=300)