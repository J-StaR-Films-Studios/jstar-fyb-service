import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Route segment config
export const runtime = 'nodejs'

// Image metadata
export const alt = 'J-Star FYB Service - Dominate Your Project'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

// Image generation
export default async function Image() {
    // Read the logo file
    const logoData = await readFile(join(process.cwd(), 'public/dark.png'))
    const logoSrc = Uint8Array.from(logoData).buffer

    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #000000, #111111)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    position: 'relative',
                }}
            >
                {/* Abstract Background Elements */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-20%',
                        left: '-10%',
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1), transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-20%',
                        right: '-10%',
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1), transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                />

                {/* Content */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
                    {/* @ts-ignore */}
                    <img src={logoSrc} width="120" height="120" style={{ borderRadius: '12px' }} />
                </div>

                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 800,
                        background: 'linear-gradient(to right, #fff, #aaa)',
                        backgroundClip: 'text',
                        color: 'transparent',
                        marginBottom: 20,
                        letterSpacing: '-2px',
                        textAlign: 'center',
                    }}
                >
                    J-Star FYB Service
                </div>

                <div
                    style={{
                        fontSize: 36,
                        color: '#888',
                        textAlign: 'center',
                        maxWidth: '800px',
                        lineHeight: 1.4,
                    }}
                >
                    Dominating Final Year Projects with AI
                </div>

                <div
                    style={{
                        marginTop: 60,
                        padding: '12px 24px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '50px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: 24,
                        color: '#ddd',
                    }}
                >
                    fyb.jstarstudios.com
                </div>
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    )
}
