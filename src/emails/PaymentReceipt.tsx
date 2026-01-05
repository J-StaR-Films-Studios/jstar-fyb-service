import * as React from 'react';
import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Row,
    Column,
} from '@react-email/components';

interface PaymentReceiptEmailProps {
    name: string;
    amount: number;
    reference: string;
    projectTopic: string;
    date: Date;
}

export const PaymentReceiptEmail = ({
    name,
    amount,
    reference,
    projectTopic,
    date,
}: PaymentReceiptEmailProps) => {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <Html>
            <Head />
            <Preview>🎉 Payment Confirmed - Your project is now unlocked!</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Text style={logoText}>J-STAR FYB</Text>
                        <Text style={tagline}>Final Year Project Service</Text>
                    </Section>

                    {/* Success Icon */}
                    <Section style={{ textAlign: 'center' as const, padding: '20px 0' }}>
                        <div style={successCircle}>✓</div>
                    </Section>

                    <Heading style={heading}>Payment Confirmed!</Heading>

                    <Text style={paragraph}>
                        Hey {name.split(' ')[0]} 👋
                    </Text>
                    <Text style={paragraph}>
                        Your payment of <strong style={{ color: '#22c55e' }}>₦{amount.toLocaleString()}</strong> has been received.
                        Your project workspace is now fully unlocked!
                    </Text>

                    {/* Receipt Card */}
                    <Section style={receiptCard}>
                        <Text style={receiptTitle}>📄 Receipt Details</Text>
                        <Hr style={divider} />
                        <Row style={receiptRow}>
                            <Column style={receiptLabel}>Reference</Column>
                            <Column style={receiptValue}>{reference}</Column>
                        </Row>
                        <Row style={receiptRow}>
                            <Column style={receiptLabel}>Project</Column>
                            <Column style={receiptValue}>{projectTopic.length > 40 ? projectTopic.slice(0, 40) + '...' : projectTopic}</Column>
                        </Row>
                        <Row style={receiptRow}>
                            <Column style={receiptLabel}>Date</Column>
                            <Column style={receiptValue}>{formattedDate}</Column>
                        </Row>
                        <Row style={receiptRow}>
                            <Column style={receiptLabel}>Amount</Column>
                            <Column style={{ ...receiptValue, color: '#22c55e', fontWeight: 700 }}>₦{amount.toLocaleString()}</Column>
                        </Row>
                    </Section>

                    {/* What's Unlocked */}
                    <Section style={unlockedSection}>
                        <Text style={{ ...paragraph, marginBottom: '12px', fontWeight: 600 }}>🔓 What you now have access to:</Text>
                        <Text style={bulletPoint}>✅ Full chapter editing & formatting</Text>
                        <Text style={bulletPoint}>✅ Unlimited AI refinements</Text>
                        <Text style={bulletPoint}>✅ Export to PDF & Word</Text>
                        <Text style={bulletPoint}>✅ Research library integration</Text>
                    </Section>

                    {/* CTA Button */}
                    <Section style={{ textAlign: 'center' as const, marginTop: '32px', marginBottom: '32px' }}>
                        <Link
                            href="https://fyb.jstarstudios.com/project/builder"
                            style={button}
                        >
                            Open Project Builder →
                        </Link>
                    </Section>

                    <Hr style={divider} />

                    {/* Footer */}
                    <Text style={footer}>
                        Need help? Just reply to this email or contact us at{' '}
                        <Link href="mailto:hey@jstarstudios.com" style={link}>hey@jstarstudios.com</Link>
                    </Text>
                    <Text style={footerSmall}>
                        J-Star FYB Service © 2026 • Dominating Final Year Projects
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#0a0a0b',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
    backgroundColor: '#111113',
    margin: '0 auto',
    padding: '40px 20px',
    maxWidth: '500px',
    borderRadius: '16px',
    border: '1px solid #222',
};

const header = {
    textAlign: 'center' as const,
    marginBottom: '20px',
};

const logoText = {
    fontSize: '24px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '2px',
    margin: '0',
};

const tagline = {
    fontSize: '12px',
    color: '#666',
    margin: '4px 0 0 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
};

const successCircle = {
    display: 'inline-block',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    border: '2px solid #22c55e',
    color: '#22c55e',
    fontSize: '28px',
    lineHeight: '56px',
    textAlign: 'center' as const,
};

const heading = {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: 700,
    textAlign: 'center' as const,
    margin: '20px 0',
};

const paragraph = {
    color: '#a1a1aa',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '16px 0',
};

const receiptCard = {
    backgroundColor: '#1a1a1d',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2a2a2d',
    marginTop: '24px',
};

const receiptTitle = {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 12px 0',
};

const receiptRow = {
    marginBottom: '8px',
};

const receiptLabel = {
    color: '#666',
    fontSize: '13px',
    width: '100px',
};

const receiptValue = {
    color: '#e4e4e7',
    fontSize: '13px',
    textAlign: 'right' as const,
};

const unlockedSection = {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    marginTop: '24px',
};

const bulletPoint = {
    color: '#a1a1aa',
    fontSize: '14px',
    margin: '8px 0',
    lineHeight: '20px',
};

const button = {
    backgroundColor: '#8b5cf6',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center' as const,
    padding: '14px 28px',
    display: 'inline-block',
};

const divider = {
    borderColor: '#2a2a2d',
    margin: '24px 0',
};

const footer = {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center' as const,
    margin: '16px 0',
};

const footerSmall = {
    color: '#444',
    fontSize: '11px',
    textAlign: 'center' as const,
    margin: '8px 0 0 0',
};

const link = {
    color: '#8b5cf6',
    textDecoration: 'underline',
};

export default PaymentReceiptEmail;

