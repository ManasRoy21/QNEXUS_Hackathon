"""Without-replacement parameter estimation for observed mismatch registers.

Serfling bounds the population mean from a uniform test sample; algebra then
bounds the untested mean. This is a sampling statement, not a QDS security proof.
"""
import math
import numpy as np


def estimate_remaining(errors, test_indices, threshold, failure_probability):
    population = len(errors)
    tested = len(test_indices)
    retained = population - tested
    if not population or not tested or not retained:
        return {'decision': 'NO_DATA', 'population': population, 'tested': tested,
                'retained': retained, 'test_errors': 0, 'test_qber': None,
                'remaining_error_upper_bound': None, 'audit_remaining_qber': None,
                'failure_probability': failure_probability,
                'reason': 'Need detected, basis-matched bits in both test and retained sets.'}
    test_errors = int(np.count_nonzero(errors[test_indices]))
    test_rate = test_errors / tested
    # P(mu_population - mean_test >= t) <= exp(-2*n*t²/(1-(n-1)/N)).
    # mean_retained - mean_test = N/(N-n)*(mu_population - mean_test).
    correction = 1 - (tested - 1) / population
    radius = population / retained * math.sqrt(correction * math.log(1 / failure_probability) / (2 * tested))
    upper = min(1.0, test_rate + radius)
    remaining_errors = int(np.count_nonzero(errors)) - test_errors
    decision = 'SAMPLE_REJECT' if test_rate > threshold else 'PASS' if upper <= threshold else 'INCONCLUSIVE'
    return {'decision': decision, 'population': population, 'tested': tested,
            'retained': retained, 'test_errors': test_errors, 'test_qber': test_rate,
            'remaining_error_upper_bound': upper, 'sampling_radius': radius,
            'audit_remaining_qber': remaining_errors / retained,
            'failure_probability': failure_probability, 'threshold': threshold,
            'formula': 'upper_remaining = min(1, e_test + N/(N-n)*sqrt((1-(n-1)/N)*ln(1/epsilon)/(2n)))',
            'reason': {'PASS': 'Sampling bound is below the configured error policy.',
                       'SAMPLE_REJECT': 'Observed test mismatch exceeds policy; noise can also cause rejection.',
                       'INCONCLUSIVE': 'The test sample cannot certify the configured error policy.'}[decision]}
