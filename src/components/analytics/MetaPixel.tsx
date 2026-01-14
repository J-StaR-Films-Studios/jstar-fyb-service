'use client';

import Script from 'next/script';

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export function MetaPixel() {
    // Don't render if no pixel ID configured
    if (!FB_PIXEL_ID) return null;

    return (
        <>
            {/* Meta Pixel Base Code */}
            <Script
                id="fb-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
                }}
            />
            {/* Fallback noscript */}
            <noscript>
                <img
                    height="1"
                    width="1"
                    style={{ display: 'none' }}
                    src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
                    alt=""
                />
            </noscript>
        </>
    );
}

/**
 * Track custom events with Meta Pixel
 * Call these from anywhere in your app
 * 
 * @example
 * // Track when user signs up
 * trackFBEvent('CompleteRegistration');
 * 
 * // Track when user makes a purchase
 * trackFBEvent('Purchase', { value: 15000, currency: 'NGN' });
 */
export function trackFBEvent(
    eventName: string,
    params?: Record<string, unknown>
) {
    if (typeof window !== 'undefined' && (window as any).fbq) {
        if (params) {
            (window as any).fbq('track', eventName, params);
        } else {
            (window as any).fbq('track', eventName);
        }
    }
}

// Pre-defined event helpers for common conversions
export const MetaPixelEvents = {
    /** User starts the free trial / creates account */
    signUp: () => trackFBEvent('CompleteRegistration'),

    /** User initiates a payment checkout */
    initiateCheckout: (value: number) =>
        trackFBEvent('InitiateCheckout', { value, currency: 'NGN' }),

    /** User completes a purchase */
    purchase: (value: number, tier: string) =>
        trackFBEvent('Purchase', { value, currency: 'NGN', content_name: tier }),

    /** User views important content (e.g., pricing page) */
    viewContent: (contentName: string) =>
        trackFBEvent('ViewContent', { content_name: contentName }),

    /** User adds to cart / shows interest */
    addToCart: (value: number, contentName: string) =>
        trackFBEvent('AddToCart', { value, currency: 'NGN', content_name: contentName }),
};
