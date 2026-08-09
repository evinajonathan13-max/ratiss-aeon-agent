"""
RATISS V9 AEON PRIME - MEMORY GUARD MODULE ADAPTATIF VEGA8 SAFE
Hardware Target: AMD Ryzen 5 PRO 2500U (4C/8T) + AMD Radeon Vega 8 Graphics + 8GB RAM SHARED
Strict RAM Limit: 7500 MB (7.5 GB) Peak Limit before proactive graceful abort.
"""

import sys
import os
import gc
import functools
import logging

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import resource
    HAS_RESOURCE = True
except ImportError:
    HAS_RESOURCE = False

logging.basicConfig(level=logging.INFO, format="[RATISS-MEMGUARD] %(asctime)s - %(message)s", stream=sys.stderr, force=True)

def get_current_memory_mb() -> float:
    """Returns current Resident Set Size (RSS) memory of the process in MB."""
    if HAS_PSUTIL:
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)
    elif HAS_RESOURCE:
        # ru_maxrss is in KB on Linux
        usage = resource.getrusage(resource.RUSAGE_SELF)
        return usage.ru_maxrss / 1024.0
    else:
        try:
            with open('/proc/self/status') as f:
                for line in f:
                    if line.startswith('VmRSS:'):
                        return float(line.split()[1]) / 1024.0
        except Exception:
            pass
    return 45.0  # Fallback baseline MB

def get_available_memory_mb() -> float:
    """Returns available system memory in MB."""
    if HAS_PSUTIL:
        return psutil.virtual_memory().available / (1024 * 1024)
    else:
        try:
            with open('/proc/meminfo') as f:
                for line in f:
                    if line.startswith('MemAvailable:'):
                        return float(line.split()[1]) / 1024.0
        except Exception:
            pass
    return 4000.0  # Fallback safe estimate in MB for Ryzen 8GB shared

def memory_guard(max_mb: float = 7500.0):
    """
    Decorator to enforce strict RAM threshold before and after function execution.
    Triggers explicit garbage collection and aborts gracefully if memory exceeds max_mb.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            mem_before = get_current_memory_mb()
            if mem_before > max_mb:
                logging.critical(f"OOM PRE-CHECK FAILURE: Memory ({mem_before:.2f} MB) exceeds limit ({max_mb} MB) before running {func.__name__}")
                gc.collect()
                raise MemoryError(f"RATISS Memory Guard: Pre-execution threshold exceeded ({mem_before:.2f}MB > {max_mb}MB)")
            
            logging.info(f"Executing {func.__name__} [Initial RAM: {mem_before:.2f} MB / Limit: {max_mb} MB]")
            
            try:
                result = func(*args, **kwargs)
            finally:
                gc.collect()
                mem_after = get_current_memory_mb()
                logging.info(f"Completed {func.__name__} [Final RAM: {mem_after:.2f} MB]")
                if mem_after > max_mb:
                    logging.critical(f"OOM POST-CHECK CRITICAL: Memory ({mem_after:.2f} MB) breached limit ({max_mb} MB) after {func.__name__}")
                    raise MemoryError(f"RATISS Memory Guard: Post-execution threshold exceeded ({mem_after:.2f}MB > {max_mb}MB)")

            return result
        return wrapper
    return decorator

def dynamic_memory_guard(safety_margin: float = 0.9, max_cap_mb: float = 7500.0):
    """
    Dynamically adjusts threshold based on current available system memory.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            avail_mb = get_available_memory_mb()
            dynamic_limit = min(avail_mb * safety_margin, max_cap_mb)
            
            mem_before = get_current_memory_mb()
            if mem_before > dynamic_limit:
                logging.critical(f"OOM PRE-CHECK FAILURE: Memory ({mem_before:.2f} MB) exceeds dynamic limit ({dynamic_limit:.2f} MB)")
                gc.collect()
                raise MemoryError(f"RATISS Dynamic Memory Guard: Threshold exceeded ({mem_before:.2f}MB > {dynamic_limit:.2f}MB)")
            
            logging.info(f"Executing {func.__name__} [RAM: {mem_before:.2f} MB / Dynamic Limit: {dynamic_limit:.2f} MB]")
            
            try:
                result = func(*args, **kwargs)
            finally:
                gc.collect()
                mem_after = get_current_memory_mb()
                logging.info(f"Completed {func.__name__} [Final RAM: {mem_after:.2f} MB]")
                if mem_after > dynamic_limit:
                    logging.critical(f"OOM POST-CHECK CRITICAL: Memory ({mem_after:.2f} MB) breached dynamic limit ({dynamic_limit:.2f} MB)")
                    raise MemoryError(f"RATISS Dynamic Memory Guard: Threshold exceeded ({mem_after:.2f}MB > {dynamic_limit:.2f}MB)")

            return result
        return wrapper
    return decorator

def adaptive_throttle(func):
    """
    Throttles batch size and single-thread execution if memory usage approaches 80% available RAM.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        mem_used = get_current_memory_mb()
        mem_avail = get_available_memory_mb()
        if mem_used > 0.8 * mem_avail:
            kwargs['batch_size'] = max(1, kwargs.get('batch_size', 1000) // 2)
            kwargs['n_threads'] = 1
            logging.warning(f"[THROTTLE] {func.__name__}: Batch réduit à {kwargs.get('batch_size')}")
        return func(*args, **kwargs)
    return wrapper

def log_memory(func):
    """
    Logs memory consumption before and after execution with explicit GC.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        mem_before = get_current_memory_mb()
        result = func(*args, **kwargs)
        mem_after = get_current_memory_mb()
        logging.info(f"[MEM] {func.__name__}: {mem_before:.1f}MB → {mem_after:.1f}MB (Δ{mem_after-mem_before:+.1f}MB)")
        gc.collect()
        return result
    return wrapper

def free_memory():
    """Forces Python garbage collection and memory release."""
    gc.collect()
    mem = get_current_memory_mb()
    logging.info(f"Explicit GC triggered. Free RAM status: {mem:.2f} MB in use.")
    return mem

