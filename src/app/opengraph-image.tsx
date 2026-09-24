import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'J-Star Projects — Give your final year project room to grow'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
    return new ImageResponse(
        <div style={{ background: '#EDF1ED', color: '#193E35', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 85, fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, gap: 20 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, background: '#193E35', color: '#FFFEFA', borderRadius: 6 }}>J.</span>
                J-Star Projects
            </div>
            <div style={{ display: 'flex', marginTop: 80, background: '#FFFEFA', borderLeft: '6px solid #B34D39', padding: '36px 48px', fontSize: 64, fontWeight: 700, lineHeight: 1.12 }}>Give your final year project<br />room to grow.</div>
            <div style={{ display: 'flex', marginTop: 32, fontSize: 25, color: '#52685F' }}>Plan · Research · Write</div>
        </div>,
        size
    )
}
