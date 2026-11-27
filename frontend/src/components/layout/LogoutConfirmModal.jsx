import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import styles from './LogoutConfirmModal.module.css'

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <div className={styles.modalIconWrap}>
          <LogOut size={24} />
        </div>
        <h3 id="logout-title">Konfirmasi Keluar Akun</h3>
        <p>Apakah Anda yakin ingin keluar dari akun TimbangDulu?</p>
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.modalCancelButton}
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className={styles.modalConfirmButton}
            onClick={onConfirm}
          >
            Ya, Keluar Akun
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
