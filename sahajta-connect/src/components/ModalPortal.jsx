import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Portal wrapper — renders children into document.body so they escape any
 * transformed / filtered ancestor that would otherwise become the containing
 * block for `position: fixed` overlays.
 *
 * Locks body scroll while open.
 */
export default function ModalPortal({ children, lockScroll = true }) {
  const nodeRef = useRef(null)

  if (typeof document === 'undefined') return null

  if (!nodeRef.current) {
    nodeRef.current = document.createElement('div')
    nodeRef.current.setAttribute('data-modal-portal', '')
  }

  useEffect(() => {
    const el = nodeRef.current
    document.body.appendChild(el)

    let prevOverflow
    if (lockScroll) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    return () => {
      if (lockScroll) document.body.style.overflow = prevOverflow || ''
      if (el.parentNode) el.parentNode.removeChild(el)
    }
  }, [lockScroll])

  return createPortal(children, nodeRef.current)
}
