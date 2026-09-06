import qiskit
import qiskit_aer

def verify_installation():
    print(f"🟢 Qiskit Version:     {qiskit.__version__}")
    print(f"🟢 Qiskit Aer Version: {qiskit_aer.__version__}")

if __name__ == "__main__":
    verify_installation()