import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
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
            width: 16,
            height: 32,
            background: '#9CA3AF',
            display: 'flex',
          }}
        />
        {/* Right red half (already set on parent) */}

        {/* Left eye dot */}
        <div
          style={{
            position: 'absolute',
            left: 7,
            top: 9,
            width: 5,
            height: 4,
            borderRadius: '50%',
            background: 'white',
            opacity: 0.85,
            display: 'flex',
          }}
        />
        {/* Right eye dot */}
        <div
          style={{
            position: 'absolute',
            right: 7,
            top: 9,
            width: 5,
            height: 4,
            borderRadius: '50%',
            background: 'white',
            opacity: 0.85,
            display: 'flex',
          }}
        />

        {/* White vertical divider */}
        <div
          style={{
            position: 'absolute',
            left: 15,
            top: 0,
            width: 2,
            height: 32,
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
