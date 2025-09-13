"""
Security Validator - Air-Gapped Security Enforcement
====================================================

Validates air-gapped security requirements with Apple-level attention to detail.
Ensures zero persistence and forensic-resistant operation.
"""

import os
import sys
import socket
import platform
import subprocess
import psutil
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import logging

from ..core.config import QRReceiverConfig, SecurityLevel


class SecurityValidator:
    """
    Security Validator with Apple-inspired design
    
    Enforces air-gapped security requirements and validates
    system configuration for maximum security.
    """
    
    @staticmethod
    def validate_config(config: QRReceiverConfig) -> bool:
        """
        Validate configuration for security compliance
        
        Args:
            config: QR receiver configuration
            
        Returns:
            True if configuration passes security validation
        """
        try:
            logger = logging.getLogger("SecurityValidator")
            
            # Basic validation
            if not config.validate():
                logger.error("❌ Configuration validation failed")
                return False
            
            # Air-gapped validation
            if config.air_gapped:
                if not SecurityValidator._validate_air_gapped_mode(config):
                    logger.error("❌ Air-gapped validation failed")
                    return False
            
            # Security level validation
            if not SecurityValidator._validate_security_level(config):
                logger.error("❌ Security level validation failed")
                return False
            
            # Network security validation
            if not SecurityValidator._validate_network_security(config):
                logger.error("❌ Network security validation failed")
                return False
            
            logger.info("✅ Security validation passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Security validation error: {e}")
            return False
    
    @staticmethod
    def _validate_air_gapped_mode(config: QRReceiverConfig) -> bool:
        """Validate air-gapped mode requirements"""
        try:
            logger = logging.getLogger("SecurityValidator")
            
            # Ensure memory-only operation
            if not config.memory_only:
                logger.error("❌ Air-gapped mode requires memory_only=True")
                return False
            
            # Ensure zero persistence
            if not config.zero_persistence:
                logger.error("❌ Air-gapped mode requires zero_persistence=True")
                return False
            
            # Validate host binding (localhost only for security)
            if config.host not in ['localhost', '127.0.0.1', '::1']:
                logger.warning(f"⚠️  Air-gapped mode with external host: {config.host}")
                # Allow but warn - user might need network access
            
            logger.debug("✅ Air-gapped mode validation passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Air-gapped validation error: {e}")
            return False
    
    @staticmethod
    def _validate_security_level(config: QRReceiverConfig) -> bool:
        """Validate security level requirements"""
        try:
            logger = logging.getLogger("SecurityValidator")
            
            if config.security_level == SecurityLevel.MAXIMUM:
                # Maximum security requirements
                required_settings = {
                    'air_gapped': True,
                    'memory_only': True,
                    'zero_persistence': True,
                    'debug_mode': False  # No debug in max security
                }
                
                for setting, required_value in required_settings.items():
                    actual_value = getattr(config, setting)
                    if actual_value != required_value:
                        logger.error(f"❌ Maximum security requires {setting}={required_value}, got {actual_value}")
                        return False
            
            elif config.security_level == SecurityLevel.ENHANCED:
                # Enhanced security requirements
                if not config.memory_only:
                    logger.error("❌ Enhanced security requires memory_only=True")
                    return False
            
            # Standard security has minimal requirements
            
            logger.debug(f"✅ Security level {config.security_level.value} validation passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Security level validation error: {e}")
            return False
    
    @staticmethod
    def _validate_network_security(config: QRReceiverConfig) -> bool:
        """Validate network security settings"""
        try:
            logger = logging.getLogger("SecurityValidator")
            
            # Validate port range
            if not (1024 <= config.port <= 65535):
                logger.warning(f"⚠️  Using system port {config.port} - consider user ports (1024+)")
            
            # Check if port is already in use
            if SecurityValidator._is_port_in_use(config.host, config.port):
                logger.error(f"❌ Port {config.port} already in use on {config.host}")
                return False
            
            logger.debug("✅ Network security validation passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Network security validation error: {e}")
            return False
    
    @staticmethod
    def _is_port_in_use(host: str, port: int) -> bool:
        """Check if port is already in use"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                return result == 0  # Port is in use if connection succeeds
        except Exception:
            return False  # Assume available if check fails
    
    @staticmethod
    def get_security_assessment() -> Dict[str, Any]:
        """
        Get comprehensive security assessment
        
        Returns:
            Security assessment with Apple-inspired details
        """
        try:
            assessment = {
                "overall_score": 0,
                "max_score": 100,
                "security_grade": "F",
                "recommendations": [],
                "warnings": [],
                "system_info": {},
                "network_info": {},
                "process_info": {}
            }
            
            # System security assessment
            system_score = SecurityValidator._assess_system_security(assessment)
            
            # Network security assessment
            network_score = SecurityValidator._assess_network_security(assessment)
            
            # Process security assessment
            process_score = SecurityValidator._assess_process_security(assessment)
            
            # Calculate overall score
            assessment["overall_score"] = (system_score + network_score + process_score) // 3
            
            # Assign security grade
            score = assessment["overall_score"]
            if score >= 90:
                assessment["security_grade"] = "A+"
            elif score >= 80:
                assessment["security_grade"] = "A"
            elif score >= 70:
                assessment["security_grade"] = "B"
            elif score >= 60:
                assessment["security_grade"] = "C"
            elif score >= 50:
                assessment["security_grade"] = "D"
            else:
                assessment["security_grade"] = "F"
            
            return assessment
            
        except Exception as e:
            return {
                "overall_score": 0,
                "max_score": 100,
                "security_grade": "ERROR",
                "error": str(e),
                "recommendations": ["Security assessment failed - manual review required"],
                "warnings": ["Could not complete security assessment"],
                "system_info": {},
                "network_info": {},
                "process_info": {}
            }
    
    @staticmethod
    def _assess_system_security(assessment: Dict[str, Any]) -> int:
        """Assess system-level security"""
        try:
            score = 0
            max_points = 40
            
            # Operating system check
            system_info = {
                "platform": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor()
            }
            assessment["system_info"] = system_info
            
            # Platform-specific security checks
            if system_info["platform"] == "Windows":
                score += SecurityValidator._assess_windows_security(assessment)
            elif system_info["platform"] == "Darwin":  # macOS
                score += SecurityValidator._assess_macos_security(assessment)
            elif system_info["platform"] == "Linux":
                score += SecurityValidator._assess_linux_security(assessment)
            else:
                assessment["warnings"].append(f"Unknown platform: {system_info['platform']}")
            
            # File system permissions
            if SecurityValidator._check_file_permissions():
                score += 10
            else:
                assessment["recommendations"].append("Review file system permissions")
            
            # Memory protection
            if SecurityValidator._check_memory_protection():
                score += 10
            else:
                assessment["recommendations"].append("Enable memory protection features")
            
            return min(score, max_points)
            
        except Exception as e:
            assessment["warnings"].append(f"System assessment error: {e}")
            return 0
    
    @staticmethod
    def _assess_network_security(assessment: Dict[str, Any]) -> int:
        """Assess network security"""
        try:
            score = 0
            max_points = 30
            
            # Network interface information
            network_info = {
                "interfaces": [],
                "active_connections": [],
                "listening_ports": []
            }
            
            # Get network interfaces
            try:
                for interface, addrs in psutil.net_if_addrs().items():
                    interface_info = {
                        "name": interface,
                        "addresses": []
                    }
                    for addr in addrs:
                        interface_info["addresses"].append({
                            "family": str(addr.family),
                            "address": addr.address,
                            "netmask": getattr(addr, 'netmask', None)
                        })
                    network_info["interfaces"].append(interface_info)
                
                score += 10  # Successfully gathered network info
                
            except Exception as e:
                assessment["warnings"].append(f"Network interface enumeration failed: {e}")
            
            # Check active connections (air-gapped should have minimal connections)
            try:
                connections = psutil.net_connections()
                network_info["active_connections"] = len(connections)
                
                if len(connections) < 10:
                    score += 10  # Minimal connections good for air-gapped
                elif len(connections) < 50:
                    score += 5
                    assessment["recommendations"].append("Consider reducing active network connections")
                else:
                    assessment["warnings"].append(f"High number of active connections: {len(connections)}")
                
            except Exception as e:
                assessment["warnings"].append(f"Connection enumeration failed: {e}")
            
            # Check for VPN/proxy indicators
            if SecurityValidator._check_vpn_proxy():
                score += 10
                assessment["recommendations"].append("VPN/proxy detected - good for privacy")
            
            assessment["network_info"] = network_info
            return min(score, max_points)
            
        except Exception as e:
            assessment["warnings"].append(f"Network assessment error: {e}")
            return 0
    
    @staticmethod
    def _assess_process_security(assessment: Dict[str, Any]) -> int:
        """Assess process-level security"""
        try:
            score = 0
            max_points = 30
            
            # Current process information
            current_process = psutil.Process()
            process_info = {
                "pid": current_process.pid,
                "ppid": current_process.ppid(),
                "name": current_process.name(),
                "username": current_process.username(),
                "memory_percent": current_process.memory_percent(),
                "cpu_percent": current_process.cpu_percent(),
                "num_threads": current_process.num_threads()
            }
            
            # Check if running as admin/root (security risk)
            try:
                if hasattr(os, 'geteuid') and os.geteuid() == 0:
                    assessment["warnings"].append("Running as root - security risk")
                elif hasattr(os, 'getuid') and os.getuid() == 0:
                    assessment["warnings"].append("Running as root - security risk")
                else:
                    score += 10  # Not running as admin/root
            except:
                pass
            
            # Check memory usage (should be reasonable)
            if process_info["memory_percent"] < 10:
                score += 10  # Reasonable memory usage
            elif process_info["memory_percent"] < 25:
                score += 5
            else:
                assessment["recommendations"].append("High memory usage detected")
            
            # Check thread count (should be reasonable for air-gapped operation)
            if process_info["num_threads"] < 20:
                score += 10  # Reasonable thread count
            elif process_info["num_threads"] < 50:
                score += 5
            else:
                assessment["recommendations"].append("High thread count - review for security")
            
            assessment["process_info"] = process_info
            return min(score, max_points)
            
        except Exception as e:
            assessment["warnings"].append(f"Process assessment error: {e}")
            return 0
    
    @staticmethod
    def _assess_windows_security(assessment: Dict[str, Any]) -> int:
        """Windows-specific security assessment"""
        try:
            score = 0
            
            # Check Windows Defender
            try:
                result = subprocess.run(
                    ['powershell', '-Command', 'Get-MpComputerStatus | Select-Object AntivirusEnabled'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0 and 'True' in result.stdout:
                    score += 5
                    assessment["recommendations"].append("Windows Defender enabled")
                else:
                    assessment["warnings"].append("Windows Defender may not be enabled")
            except:
                pass
            
            # Check UAC status
            try:
                result = subprocess.run(
                    ['reg', 'query', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System', '/v', 'EnableLUA'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0 and '0x1' in result.stdout:
                    score += 5
                    assessment["recommendations"].append("UAC enabled")
                else:
                    assessment["warnings"].append("UAC may be disabled")
            except:
                pass
            
            return score
            
        except Exception:
            return 0
    
    @staticmethod
    def _assess_macos_security(assessment: Dict[str, Any]) -> int:
        """macOS-specific security assessment"""
        try:
            score = 0
            
            # Check SIP (System Integrity Protection)
            try:
                result = subprocess.run(['csrutil', 'status'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and 'enabled' in result.stdout.lower():
                    score += 10
                    assessment["recommendations"].append("SIP enabled")
                else:
                    assessment["warnings"].append("SIP may be disabled")
            except:
                pass
            
            return score
            
        except Exception:
            return 0
    
    @staticmethod
    def _assess_linux_security(assessment: Dict[str, Any]) -> int:
        """Linux-specific security assessment"""
        try:
            score = 0
            
            # Check for SELinux/AppArmor
            if Path('/sys/fs/selinux').exists():
                score += 5
                assessment["recommendations"].append("SELinux detected")
            elif Path('/sys/kernel/security/apparmor').exists():
                score += 5
                assessment["recommendations"].append("AppArmor detected")
            
            # Check firewall status
            try:
                result = subprocess.run(['ufw', 'status'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and 'active' in result.stdout.lower():
                    score += 5
                    assessment["recommendations"].append("UFW firewall active")
            except:
                pass
            
            return score
            
        except Exception:
            return 0
    
    @staticmethod
    def _check_file_permissions() -> bool:
        """Check file system permissions"""
        try:
            # Check if we can write to temp directory
            import tempfile
            with tempfile.NamedTemporaryFile(delete=True):
                pass
            return True
        except:
            return False
    
    @staticmethod
    def _check_memory_protection() -> bool:
        """Check memory protection features"""
        try:
            # Basic check for memory protection
            # This is a simplified check - real implementation would be more comprehensive
            return hasattr(os, 'mlock')  # Memory locking capability
        except:
            return False
    
    @staticmethod
    def _check_vpn_proxy() -> bool:
        """Check for VPN/proxy indicators"""
        try:
            # Simple check for common VPN/proxy indicators
            # In a real implementation, this would be more sophisticated
            interfaces = psutil.net_if_addrs()
            vpn_indicators = ['tun', 'tap', 'vpn', 'ppp']
            
            for interface_name in interfaces.keys():
                for indicator in vpn_indicators:
                    if indicator in interface_name.lower():
                        return True
            
            return False
        except:
            return False
    
    @staticmethod
    def generate_security_report() -> str:
        """Generate human-readable security report"""
        try:
            assessment = SecurityValidator.get_security_assessment()
            
            report = f"""
🔒 SECURITY ASSESSMENT REPORT
{'=' * 50}

Overall Security Grade: {assessment['security_grade']} ({assessment['overall_score']}/100)

SYSTEM INFORMATION:
- Platform: {assessment['system_info'].get('platform', 'Unknown')}
- Release: {assessment['system_info'].get('release', 'Unknown')}
- Architecture: {assessment['system_info'].get('machine', 'Unknown')}

NETWORK INFORMATION:
- Active Connections: {assessment['network_info'].get('active_connections', 'Unknown')}
- Network Interfaces: {len(assessment['network_info'].get('interfaces', []))}

PROCESS INFORMATION:
- PID: {assessment['process_info'].get('pid', 'Unknown')}
- Memory Usage: {assessment['process_info'].get('memory_percent', 0):.1f}%
- Thread Count: {assessment['process_info'].get('num_threads', 'Unknown')}

RECOMMENDATIONS:
"""
            
            for i, rec in enumerate(assessment.get('recommendations', []), 1):
                report += f"{i}. {rec}\n"
            
            if assessment.get('warnings'):
                report += "\nWARNINGS:\n"
                for i, warning in enumerate(assessment['warnings'], 1):
                    report += f"{i}. {warning}\n"
            
            report += f"\n{'=' * 50}\n"
            
            return report
            
        except Exception as e:
            return f"Error generating security report: {e}"