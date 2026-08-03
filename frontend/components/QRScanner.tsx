'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanFailure?: (error: string) => void
  isPaused?: boolean
}

/**
 * Direct Html5Qrcode scanner component.
 * - Opens Back Camera (facingMode: environment) automatically without camera selection dropdown
 * - Minimal, fast, and responsive for mobile view
 */
export default function QRScanner({ onScanSuccess, onScanFailure, isPaused }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef<boolean>(false)

  useEffect(() => {
    const elementId = "qr-reader"
    const html5QrCode = new Html5Qrcode(elementId)
    scannerRef.current = html5QrCode

    const config = {
      fps: 24,
      qrbox: (width: number, height: number) => {
        const minEdge = Math.min(width, height)
        const size = Math.max(160, Math.floor(minEdge * 0.65))
        return { width: size, height: size }
      },
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    }

    // Force start with environment camera (Back Camera)
    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (scannerRef.current && isScanningRef.current) {
          try {
            scannerRef.current.pause(true)
          } catch {
            // ignore
          }
        }
        onScanSuccess(decodedText)
      },
      (errorMessage) => {
        if (onScanFailure) {
          onScanFailure(errorMessage)
        }
      }
    ).then(() => {
      isScanningRef.current = true
    }).catch(err => {
      console.error("Failed to start QR scanner with back camera:", err)
      // Fallback: try facingMode user if environment camera fails
      html5QrCode.start(
        { facingMode: "user" },
        config,
        (decodedText) => {
          if (scannerRef.current && isScanningRef.current) {
            try {
              scannerRef.current.pause(true)
            } catch {
              // ignore
            }
          }
          onScanSuccess(decodedText)
        },
        () => {}
      ).then(() => {
        isScanningRef.current = true
      }).catch(fallbackErr => {
        console.error("Failed to start QR scanner with fallback camera:", fallbackErr)
      })
    })

    return () => {
      if (scannerRef.current) {
        if (isScanningRef.current) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear()
          }).catch(err => {
            console.error("Failed to stop scanner:", err)
          })
        } else {
          try {
            scannerRef.current.clear()
          } catch {
            // ignore
          }
        }
        scannerRef.current = null
        isScanningRef.current = false
      }
    }
  }, [onScanSuccess, onScanFailure])

  useEffect(() => {
    if (!scannerRef.current || !isScanningRef.current) return
    try {
      if (isPaused) {
        scannerRef.current.pause(true)
      } else {
        scannerRef.current.resume()
      }
    } catch {
      // Ignore if scanner isn't running or paused yet
    }
  }, [isPaused])

  return (
    <div className="w-full overflow-hidden relative">
      <div id="qr-reader" className="w-full border-none relative min-h-[300px] rounded-2xl bg-slate-900 overflow-hidden shadow-inner" />
    </div>
  )
}
