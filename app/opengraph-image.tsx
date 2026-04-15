import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Tipora — Finding the angle the market missed';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090b',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 72, fontWeight: 800, color: '#ffffff' }}>tipora</span>
          <span style={{ fontSize: 72, fontWeight: 800, color: '#34d399' }}>.</span>
          <span style={{ fontSize: 72, fontWeight: 800, color: '#ffffff' }}>bet</span>
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            marginTop: 24,
            maxWidth: 700,
            textAlign: 'center',
          }}
        >
          Finding the angle the market missed.
        </div>
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 48,
            fontSize: 20,
            color: '#71717a',
          }}
        >
          <span>Data-Driven Tips</span>
          <span>|</span>
          <span>Full P&L Tracking</span>
          <span>|</span>
          <span>30+ Markets</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
