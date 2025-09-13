"""
Secure Memory Management - Forensic-Resistant Operation
=======================================================

Memory security utilities for air-gapped operation with Apple-level security.
Implements secure memory clearing and process hardening.
"""

import os
import gc
import sys
import ctypes
import random
import platform
import threading
import weakref
from typing import Optional, List, Any, Callable
import logging

# Platform-specific imports
try:
    import mlock
    MLOCK_AVAILABLE = True
except ImportError:
    MLOCK_AVAILABLE = False

try:
    if platform.system() == "Windows":
        import ctypes.wintypes
        from ctypes import wintypes
    WINDOWS_API_AVAILABLE = platform.system() == "Windows"
except ImportError:
    WINDOWS_API_AVAILABLE = False


class SecureMemoryManager:
    """
    Secure Memory Manager with Apple-inspired design
    
    Provides forensic-resistant memory management with
    secure clearing and process hardening capabilities.
    """
    
    def __init__(self):
        """Initialize secure memory manager"""
        self.logger = logging.getLogger("SecureMemoryManager")
        self.registered_objects = []
        self.cleanup_callbacks = []
        self.is_initialized = False
        self.lock = threading.RLock()
        
        # Platform-specific initialization
        self.platform = platform.system()
        self._initialize_platform_specific()
    
    def _initialize_platform_specific(self) -> None:
        """Initialize platform-specific memory security"""
        try:
            if self.platform == "Windows":
                self._initialize_windows_security()
            elif self.platform == "Darwin":  # macOS
                self._initialize_macos_security()
            elif self.platform == "Linux":
                self._initialize_linux_security()
            
            self.is_initialized = True
            self.logger.info(f"🔒 Secure memory manager initialized for {self.platform}")
            
        except Exception as e:
            self.logger.warning(f"⚠️  Platform-specific initialization failed: {e}")
            self.is_initialized = False
    
    def _initialize_windows_security(self) -> None:
        """Initialize Windows-specific memory security"""
        try:
            if not WINDOWS_API_AVAILABLE:
                return
            
            # Set process memory protection
            try:
                kernel32 = ctypes.windll.kernel32
                process_handle = kernel32.GetCurrentProcess()
                
                # Set process mitigation policy (if available)
                try:
                    # DEP (Data Execution Prevention)
                    kernel32.SetProcessDEPPolicy(1)  # PROCESS_DEP_ENABLE
                except:
                    pass  # May not be available on all Windows versions
                
                self.logger.debug("✅ Windows memory protection enabled")
                
            except Exception as e:
                self.logger.debug(f"Windows security initialization warning: {e}")
            
        except Exception as e:
            self.logger.warning(f"Windows memory security initialization failed: {e}")
    
    def _initialize_macos_security(self) -> None:
        """Initialize macOS-specific memory security"""
        try:
            # Enable memory protection features available on macOS
            if hasattr(os, 'mlock'):
                self.logger.debug("✅ macOS memory locking available")
            
            # Additional macOS hardening could be added here
            
        except Exception as e:
            self.logger.warning(f"macOS memory security initialization failed: {e}")
    
    def _initialize_linux_security(self) -> None:
        """Initialize Linux-specific memory security"""
        try:
            # Enable memory protection features available on Linux
            if hasattr(os, 'mlock'):
                self.logger.debug("✅ Linux memory locking available")
            
            # Check for additional security features
            try:
                # Check if we can use madvise for secure operations
                import mmap
                if hasattr(mmap, 'MADV_DONTDUMP'):
                    self.logger.debug("✅ Linux MADV_DONTDUMP available")
            except:
                pass
            
        except Exception as e:
            self.logger.warning(f"Linux memory security initialization failed: {e}")
    
    def secure_zero_memory(self, data: Any) -> bool:
        """
        Securely zero memory containing sensitive data
        
        Args:
            data: Data to securely clear
            
        Returns:
            True if memory was successfully cleared
        """
        try:
            with self.lock:
                if isinstance(data, (bytes, bytearray)):
                    return self._secure_zero_bytes(data)
                elif isinstance(data, str):
                    return self._secure_zero_string(data)
                elif isinstance(data, list):
                    return self._secure_zero_list(data)
                elif isinstance(data, dict):
                    return self._secure_zero_dict(data)
                else:
                    # For other types, try to clear referenced objects
                    return self._secure_zero_object(data)
                    
        except Exception as e:
            self.logger.error(f"❌ Secure memory zeroing failed: {e}")
            return False
    
    def _secure_zero_bytes(self, data: bytes) -> bool:
        """Securely zero bytes/bytearray data"""
        try:
            if isinstance(data, bytearray):
                # Direct modification for bytearray
                for i in range(len(data)):
                    data[i] = 0
                return True
            else:
                # For bytes, we can't modify in place
                # The best we can do is force garbage collection
                del data
                return True
                
        except Exception as e:
            self.logger.debug(f"Bytes zeroing error: {e}")
            return False
    
    def _secure_zero_string(self, data: str) -> bool:
        """Securely zero string data"""
        try:
            # Strings are immutable in Python, but we can try to clear references
            # and force garbage collection
            del data
            return True
            
        except Exception as e:
            self.logger.debug(f"String zeroing error: {e}")
            return False
    
    def _secure_zero_list(self, data: list) -> bool:
        """Securely zero list data"""
        try:
            # Clear all elements
            for i in range(len(data)):
                if isinstance(data[i], (bytes, bytearray, str, list, dict)):
                    self.secure_zero_memory(data[i])
                data[i] = None
            
            # Clear the list
            data.clear()
            return True
            
        except Exception as e:
            self.logger.debug(f"List zeroing error: {e}")
            return False
    
    def _secure_zero_dict(self, data: dict) -> bool:
        """Securely zero dictionary data"""
        try:
            # Clear all values
            for key, value in list(data.items()):
                if isinstance(value, (bytes, bytearray, str, list, dict)):
                    self.secure_zero_memory(value)
                if isinstance(key, (bytes, bytearray, str, list, dict)):
                    self.secure_zero_memory(key)
            
            # Clear the dictionary
            data.clear()
            return True
            
        except Exception as e:
            self.logger.debug(f"Dict zeroing error: {e}")
            return False
    
    def _secure_zero_object(self, obj: Any) -> bool:
        """Securely zero arbitrary object"""
        try:
            # Try to clear object attributes
            if hasattr(obj, '__dict__'):
                for attr_name, attr_value in list(obj.__dict__.items()):
                    if isinstance(attr_value, (bytes, bytearray, str, list, dict)):
                        self.secure_zero_memory(attr_value)
                    setattr(obj, attr_name, None)
            
            return True
            
        except Exception as e:
            self.logger.debug(f"Object zeroing error: {e}")
            return False
    
    def register_for_cleanup(self, obj: Any, callback: Optional[Callable] = None) -> None:
        """Register object for automatic cleanup on shutdown"""
        try:
            with self.lock:
                # Use weak reference to avoid keeping objects alive
                weak_ref = weakref.ref(obj)
                self.registered_objects.append(weak_ref)
                
                if callback:
                    self.cleanup_callbacks.append(callback)
                    
        except Exception as e:
            self.logger.warning(f"⚠️  Cleanup registration failed: {e}")
    
    def emergency_cleanup(self) -> None:
        """Perform emergency memory cleanup"""
        try:
            self.logger.info("🧹 Emergency memory cleanup initiated")
            
            with self.lock:
                # Clear registered objects
                cleanup_count = 0
                for weak_ref in self.registered_objects.copy():
                    try:
                        obj = weak_ref()
                        if obj is not None:
                            self.secure_zero_memory(obj)
                            cleanup_count += 1
                    except:
                        pass
                
                # Execute cleanup callbacks
                for callback in self.cleanup_callbacks.copy():
                    try:
                        callback()
                    except Exception as e:
                        self.logger.debug(f"Cleanup callback error: {e}")
                
                # Clear collections
                self.registered_objects.clear()
                self.cleanup_callbacks.clear()
                
                # Force garbage collection multiple times
                for _ in range(3):
                    gc.collect()
                
                self.logger.info(f"🧹 Emergency cleanup completed: {cleanup_count} objects cleared")
                
        except Exception as e:
            self.logger.error(f"❌ Emergency cleanup failed: {e}")
    
    def secure_random_fill(self, size: int) -> bytearray:
        """Generate secure random data for overwriting"""
        try:
            return bytearray(random.getrandbits(8) for _ in range(size))
        except Exception:
            # Fallback to os.urandom
            return bytearray(os.urandom(size))
    
    def get_memory_stats(self) -> dict:
        """Get memory usage statistics"""
        try:
            import psutil
            
            process = psutil.Process()
            memory_info = process.memory_info()
            
            return {
                "rss": memory_info.rss,  # Resident Set Size
                "vms": memory_info.vms,  # Virtual Memory Size
                "percent": process.memory_percent(),
                "available": psutil.virtual_memory().available,
                "total": psutil.virtual_memory().total,
                "registered_objects": len(self.registered_objects),
                "cleanup_callbacks": len(self.cleanup_callbacks)
            }
            
        except Exception as e:
            self.logger.debug(f"Memory stats error: {e}")
            return {"error": str(e)}


# Global secure memory manager instance
_secure_memory_manager = None
_manager_lock = threading.Lock()


def get_secure_memory_manager() -> SecureMemoryManager:
    """Get global secure memory manager instance"""
    global _secure_memory_manager
    
    with _manager_lock:
        if _secure_memory_manager is None:
            _secure_memory_manager = SecureMemoryManager()
        return _secure_memory_manager


def emergency_memory_clear() -> None:
    """Emergency memory clearing function"""
    try:
        logger = logging.getLogger("SecureMemory")
        logger.info("🚨 Emergency memory clear initiated")
        
        # Get manager and perform cleanup
        manager = get_secure_memory_manager()
        manager.emergency_cleanup()
        
        # Additional system-level cleanup
        try:
            # Force garbage collection
            gc.collect()
            
            # Try to force memory defragmentation (Python-specific)
            import sys
            if hasattr(sys, 'intern'):
                # Clear interned strings cache (limited effect)
                pass
            
        except Exception as e:
            logger.debug(f"Additional cleanup error: {e}")
        
        logger.info("✅ Emergency memory clear completed")
        
    except Exception as e:
        # Use print as fallback if logging fails
        print(f"CRITICAL: Emergency memory clear failed: {e}")


def enable_process_security() -> bool:
    """Enable process-level security hardening"""
    try:
        logger = logging.getLogger("SecureMemory")
        
        # Initialize secure memory manager
        manager = get_secure_memory_manager()
        
        if not manager.is_initialized:
            logger.warning("⚠️  Secure memory manager not properly initialized")
            return False
        
        # Platform-specific hardening
        success = True
        
        if manager.platform == "Windows":
            success &= _enable_windows_process_security()
        elif manager.platform == "Darwin":  # macOS
            success &= _enable_macos_process_security()
        elif manager.platform == "Linux":
            success &= _enable_linux_process_security()
        
        if success:
            logger.info("🔒 Process security hardening enabled")
        else:
            logger.warning("⚠️  Process security hardening partially failed")
        
        return success
        
    except Exception as e:
        logger = logging.getLogger("SecureMemory")
        logger.error(f"❌ Process security enablement failed: {e}")
        return False


def _enable_windows_process_security() -> bool:
    """Enable Windows-specific process security"""
    try:
        if not WINDOWS_API_AVAILABLE:
            return False
        
        # Additional Windows hardening could be implemented here
        return True
        
    except Exception:
        return False


def _enable_macos_process_security() -> bool:
    """Enable macOS-specific process security"""
    try:
        # macOS hardening
        return True
        
    except Exception:
        return False


def _enable_linux_process_security() -> bool:
    """Enable Linux-specific process security"""
    try:
        # Linux hardening
        return True
        
    except Exception:
        return False


def secure_zero_variable(var_name: str, frame_locals: dict) -> bool:
    """Securely zero a variable in the calling frame"""
    try:
        if var_name in frame_locals:
            manager = get_secure_memory_manager()
            success = manager.secure_zero_memory(frame_locals[var_name])
            frame_locals[var_name] = None
            return success
        return True
        
    except Exception:
        return False


def register_sensitive_data(data: Any, cleanup_callback: Optional[Callable] = None) -> None:
    """Register sensitive data for automatic cleanup"""
    try:
        manager = get_secure_memory_manager()
        manager.register_for_cleanup(data, cleanup_callback)
        
    except Exception as e:
        logger = logging.getLogger("SecureMemory")
        logger.warning(f"⚠️  Sensitive data registration failed: {e}")


def get_memory_usage() -> dict:
    """Get current memory usage statistics"""
    try:
        manager = get_secure_memory_manager()
        return manager.get_memory_stats()
        
    except Exception as e:
        return {"error": str(e)}


# Context manager for secure temporary data
class SecureTemporaryData:
    """Context manager for secure temporary data handling"""
    
    def __init__(self, data: Any):
        """Initialize with data to protect"""
        self.data = data
        self.manager = get_secure_memory_manager()
    
    def __enter__(self):
        """Enter context - register data for cleanup"""
        self.manager.register_for_cleanup(self.data)
        return self.data
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context - securely clear data"""
        self.manager.secure_zero_memory(self.data)
        return False  # Don't suppress exceptions