'use client'

import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanFailure?: (error: string) => void
  isPaused?: boolean
}

/**
 * Minimal QR scanner wrapper.
 * - Renders html5-qrcode inside a clean rounded card
 * - Translates button labels to Thai
 * - Replaces the default icon with a lightweight SVG
 */
export default function QRScanner({ onScanSuccess, onScanFailure, isPaused }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    const config = {
      fps: 24, // Increased from 10 to 24 for instant detection
      qrbox: (width: number, height: number) => {
        const minEdge = Math.min(width, height)
        // Ensure scanner box fits within all mobile screens cleanly
        const size = Math.max(160, Math.floor(minEdge * 0.65))
        return { width: size, height: size }
      },
      aspectRatio: 1.0,
      // Restrict support ONLY to QR Codes to avoid processing other formats (increases speed and stability)
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      rememberLastUsedCamera: true,
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        config,
        false // verbose=false
      )

      scannerRef.current.render(
        (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.pause(true)
          }
          onScanSuccess(decodedText)
        },
        (errorMessage) => {
          if (onScanFailure) {
            onScanFailure(errorMessage)
          }
        }
      )

      // Translate UI to Thai + inject custom icon
      localizeScanner()
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        scannerRef.current = null
      }
    }
  }, [onScanSuccess, onScanFailure])

  useEffect(() => {
    if (!scannerRef.current) return
    try {
      if (isPaused) {
        scannerRef.current.pause(true)
      } else {
        scannerRef.current.resume()
      }
    } catch (e) {
      // Ignore if scanner isn't running or paused yet
    }
  }, [isPaused])

  return (
    <div className="w-full overflow-hidden relative">
      <div id="qr-reader" className="w-full border-none relative" />
    </div>
  )
}

// ─── Thai localisation + icon removal ────────────────────────────────────────

const LABEL_MAP: Record<string, string> = {
  'request camera permissions': 'อนุญาตการเข้าถึงกล้อง',
  'stop scanning': 'หยุดสแกน',
  'start scanning': 'เริ่มสแกน',
  'scan an image file': 'อัปโหลดจากไฟล์รูปภาพ',
  'scan using camera directly': 'สแกนด้วยกล้อง',
  'choose image': 'เลือกรูปภาพ',
  'no image chosen': 'ยังไม่ได้เลือกรูป',
  'or drop an image to scan': 'หรือลากไฟล์มาวางที่นี่',
  'scanning': 'กำลังสแกน',
}

function localizeScanner() {
  const container = document.getElementById('qr-reader')
  if (!container) return

  const observer = new MutationObserver(() => {
    // 1. Translate Button Texts
    const buttons = container.querySelectorAll('button')
    buttons.forEach((btn) => {
      const text = btn.textContent?.trim().toLowerCase() ?? ''
      if (LABEL_MAP[text]) {
        btn.textContent = LABEL_MAP[text]
      }
    })

    // 2. Translate Anchor Texts
    const links = container.querySelectorAll('a')
    links.forEach((link) => {
      const text = link.textContent?.trim().toLowerCase() ?? ''
      if (LABEL_MAP[text]) {
        link.textContent = LABEL_MAP[text]
      }
    })

    // 3. Hide Default Images (No custom icon injection to ensure ultra-minimal layout)
    const dashboard = document.getElementById('qr-reader__dashboard_section_csr')
    if (dashboard) {
      const images = dashboard.querySelectorAll('img')
      images.forEach((img) => {
        if (img.style.display !== 'none') {
          img.style.display = 'none'
        }
      })
    }
  })

  // Keep observing forever while the component is mounted
  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}
