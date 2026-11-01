import { useEffect, useMemo, useRef, useState } from 'react'
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import land110 from 'world-atlas/land-110m.json'
import { useReducedMotion } from './ui'

import { GLOBE_POINTS } from '../lib/globePoints'

const landFeature = feature(land110 as unknown as Topology, (land110 as unknown as Topology).objects.land)

export default function Globe({ focusId }: { focusId: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const rot = useRef<[number, number]>([-GLOBE_POINTS[0].lon, -20])
  const target = useRef<[number, number] | null>(null)
  const drag = useRef<{ x: number; y: number; r: [number, number] } | null>(null)
  const hovering = useRef(false)
  const [size, setSize] = useState(420)

  const focusPoint = useMemo(() => GLOBE_POINTS.find((p) => p.id === focusId)!, [focusId])
  useEffect(() => {
    target.current = [-focusPoint.lon, -focusPoint.lat * 0.6]
    if (reduced) rot.current = target.current
  }, [focusPoint, reduced])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ro = new ResizeObserver(([e]) => setSize(Math.max(260, Math.min(560, Math.floor(e.contentRect.width)))))
    ro.observe(canvas.parentElement!)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const R = size / 2 - 14
    const proj = geoOrthographic().scale(R).translate([size / 2, size / 2]).clipAngle(90)
    const path = geoPath(proj, ctx)
    const grat = geoGraticule10()
    let raf = 0
    let visible = true

    const draw = () => {
      proj.rotate([rot.current[0], rot.current[1], 0])
      ctx.clearRect(0, 0, size, size)
      const glow = ctx.createRadialGradient(size / 2, size / 2, R * 0.9, size / 2, size / 2, R * 1.18)
      glow.addColorStop(0, 'rgba(22,214,188,0.28)')
      glow.addColorStop(1, 'rgba(22,214,188,0)')
      ctx.fillStyle = glow
      ctx.beginPath(); ctx.arc(size / 2, size / 2, R * 1.18, 0, Math.PI * 2); ctx.fill()
      const ocean = ctx.createRadialGradient(size * 0.4, size * 0.35, R * 0.1, size / 2, size / 2, R)
      ocean.addColorStop(0, '#12374a'); ocean.addColorStop(1, '#0a1f2c')
      ctx.fillStyle = ocean
      ctx.beginPath(); ctx.arc(size / 2, size / 2, R, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); path(grat); ctx.strokeStyle = 'rgba(87,200,232,0.12)'; ctx.lineWidth = 0.6; ctx.stroke()
      ctx.beginPath(); path(landFeature as never); ctx.fillStyle = 'rgba(22,214,188,0.30)'; ctx.fill(); ctx.strokeStyle = 'rgba(22,214,188,0.75)'; ctx.lineWidth = 0.7; ctx.stroke()
      const center: [number, number] = [-rot.current[0], -rot.current[1]]
      for (const p of GLOBE_POINTS) {
        if (geoDistance([p.lon, p.lat], center) > Math.PI / 2 - 0.05) continue
        const xy = proj([p.lon, p.lat])
        if (!xy) continue
        const active = p.id === focusId
        if (p.kind === 'pilot') {
          ctx.fillStyle = '#16D6BC'
          ctx.beginPath(); ctx.arc(xy[0], xy[1], 5.5, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = 'rgba(22,214,188,.55)'; ctx.lineWidth = 1.4
          ctx.beginPath(); ctx.arc(xy[0], xy[1], 11 + (reduced ? 0 : 3 * Math.sin(performance.now() / 500)), 0, Math.PI * 2); ctx.stroke()
        } else {
          ctx.strokeStyle = active ? '#F7FBFD' : '#F5BD67'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3])
          ctx.beginPath(); ctx.arc(xy[0], xy[1], 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
        }
        if (p.kind === 'pilot' || active) {
          ctx.font = '500 11px "IBM Plex Mono", monospace'
          ctx.fillStyle = p.kind === 'pilot' ? '#16D6BC' : '#F5BD67'
          const text = p.kind === 'pilot' ? `${p.label} (proposed)` : `${p.label} (hypothetical)`
          const left = xy[0] > size * 0.55
          ctx.textAlign = left ? 'right' : 'left'
          ctx.fillText(text, xy[0] + (left ? -14 : 14), xy[1] + (p.kind === 'pilot' ? -10 : 4))
        }
      }
    }

    const loop = () => {
      if (visible) {
        if (target.current && !drag.current) {
          const dx = target.current[0] - rot.current[0]
          const dy = target.current[1] - rot.current[1]
          rot.current = [rot.current[0] + dx * 0.08, rot.current[1] + dy * 0.08]
          if (Math.abs(dx) + Math.abs(dy) < 0.05) target.current = null
        } else if (!reduced && !drag.current && !hovering.current) {
          rot.current = [rot.current[0] + 0.06, rot.current[1]]
        }
        draw()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(canvas)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [size, reduced, focusId])

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, r: [...rot.current] as [number, number] }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const k = 0.4
    rot.current = [drag.current.r[0] + (e.clientX - drag.current.x) * k, Math.max(-75, Math.min(75, drag.current.r[1] - (e.clientY - drag.current.y) * k))]
    target.current = null
  }
  const onUp = () => (drag.current = null)

  return (
    <div className="flex w-full justify-center">
      <canvas
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerEnter={() => (hovering.current = true)}
        onPointerLeave={() => { hovering.current = false; onUp() }}
        className="touch-pan-y cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="Interactive globe. The proposed pilot in Al Dhafra, UAE is marked; four dashed markers show hypothetical future adaptation regions with no partners. Use the location buttons for a keyboard alternative."
      />
    </div>
  )
}
