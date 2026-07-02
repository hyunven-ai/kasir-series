'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import Modal from './Modal';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCamera = devices.find((device: CameraDevice) =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
        } else {
          setError('Kamera tidak ditemukan pada perangkat ini');
        }
      })
      .catch((err) => {
        setError('Izin akses kamera ditolak atau kamera tidak aktif');
        console.error(err);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(err => console.error('Error stopping scanner on unmount:', err));
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    const startWithCamera = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      startScanner(selectedCameraId);
    };

    startWithCamera();
  }, [isOpen, selectedCameraId]);

  const startScanner = (cameraId: string) => {
    setError('');
    const html5Qrcode = new Html5Qrcode('camera-reader');
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        cameraId,
        {
          fps: 10,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            return {
              width: Math.floor(minSize * 0.85),
              height: Math.floor(minSize * 0.45), // wider for standard barcodes
            };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          playBeep();
          onScanSuccess(decodedText);
          onClose();
        },
        () => {
          // silent scan tick logs
        }
      )
      .catch((err) => {
        setError('Gagal memulai scanner kamera: ' + err);
        console.error(err);
      });
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(e => console.error('Error stopping scanner on close:', e));
        }
      } catch (e) {
        console.error('Error checking isScanning on close:', e);
      }
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Scan Barcode / IMEI / SN"
      size="md"
      footer={
        <button className="btn btn-secondary" onClick={handleClose}>
          Tutup
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div className="alert alert-error" style={{ fontSize: 13, marginBottom: 0 }}>
            ⚠️ {error}
          </div>
        )}

        {cameras.length > 1 && (
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>Pilih Kamera</label>
            <select
              className="form-control"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
            >
              {cameras.map((camera: CameraDevice, idx: number) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Kamera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1.2',
            background: '#111',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 24px rgba(0,0,0,0.85)',
          }}
        >
          <div id="camera-reader" style={{ width: '100%', height: '100%' }}></div>
          
          {/* Laser scanning visual line */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              width: '90%',
              height: '3px',
              background: '#e53935',
              boxShadow: '0 0 10px #e53935',
              zIndex: 10,
              animation: 'scanLaser 2.2s infinite ease-in-out',
            }}
          />
        </div>

        <div style={{ fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 1.5, padding: '0 8px' }}>
          Posisikan barcode produk atau nomor IMEI/SN handphone di dalam kotak bidik tengah kamera.
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanLaser {
          0% { top: 20%; opacity: 0.5; }
          50% { top: 80%; opacity: 1; }
          100% { top: 20%; opacity: 0.5; }
        }
      `}} />
    </Modal>
  );
}
