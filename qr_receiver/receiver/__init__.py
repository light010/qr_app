"""
QR Receiver Engine - Core Reception Logic
=========================================

Main reception engine for QR code transfers.
Handles protocol parsing, chunk assembly, and file reconstruction.
"""

from .qr_receiver_engine import QRReceiverEngine, ReceptionSession, ReceptionState
from .data_parser import QRDataParser, ParsedQRData
from .chunk_assembler import ChunkAssembler, ChunkInfo

__all__ = [
    'QRReceiverEngine',
    'ReceptionSession', 
    'ReceptionState',
    'QRDataParser',
    'ParsedQRData',
    'ChunkAssembler',
    'ChunkInfo'
]