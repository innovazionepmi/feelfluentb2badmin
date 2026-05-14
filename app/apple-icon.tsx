import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#DA2128',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left gray half */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 90,
            height: 180,
            background: '#9CA3AF',
            display: 'flex',
          }}
        />

        {/* Left eye */}
        <div
          style={{
            position: 'absolute',
            left: 38,
            top: 52,
            width: 28,
            height: 22,
            borderRadius: '50%',
            background: 'white',
            opacity: 0.9,
            display: 'flex',
          }}
        />
        {/* Right eye */}
        <div
          style={{
            position: 'absolute',
            right: 38,
            top: 52,
            width: 28,
            height: 22,
            borderRadius: '50%',
            background: 'white',
            opacity: 0.9,
            display: 'flex',
          }}
        />

        {/* Left smile arc (simplified as a bar) */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 118,
            width: 50,
            height: 8,
            borderRadius: '0 0 30px 30px',
            background: 'white',
            opacity: 0.8,
            display: 'flex',
          }}
        />
        {/* Right smile arc */}
        <div
          style={{
            position: 'absolute',
            right: 30,
            top: 118,
            width: 50,
            height: 8,
            borderRadius: '0 0 30px 30px',
            background: 'white',
            opacity: 0.8,
            display: 'flex',
          }}
        />

        {/* White divider */}
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 0,
            width: 4,
            height: 180,
            background: 'white',
            opacity: 0.8,
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
