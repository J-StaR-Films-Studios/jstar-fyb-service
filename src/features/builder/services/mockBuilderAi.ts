export const MOCK_TOPICS = {
    "Crypto": [
        "Blockchain-Based Fake News Detection System",
        "Decentralized Voting System using Ethereum Smart Contracts",
        "Cryptocurrency Price Prediction using LSTM Neural Networks"
    ],
    "Health": [
        "AI-Powered Hospital Triage and Patient Management System",
        "Telemedicine Platform with Real-time Video WebRTC",
        "Predictive Analysis of Disease Outbreaks using Big Data"
    ],
    "E-commerce": [
        "Multi-Vendor Marketplace with Recommendation Engine",
        "Augmented Reality Furniture Try-On Web App",
        "Inventory Management System with Sales Forecasting"
    ]
};

export class MockBuilderAi {
    static async generateTopics(keyword: string): Promise<string[]> {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

        // Simple keyword matching or default
        const key = Object.keys(MOCK_TOPICS).find(k =>
            keyword.toLowerCase().includes(k.toLowerCase())
        );

        if (key) return MOCK_TOPICS[key as keyof typeof MOCK_TOPICS];

        // Default random mix
        return [
            `AI-Based ${keyword} Analysis System`,
            `Smart ${keyword} Monitoring Platform`,
            `Automated ${keyword} Management Solution`
        ];
    }

    static async generateAbstract(topic: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return `This project examines "${topic}". Methods, implementation details and evaluation results must be supplied before they can be reported as completed work.`;
    }

    static async generateOutline(topic: string): Promise<string[]> {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return [
            "1.1 Background of Study",
            "1.2 Problem Statement",
            "1.3 Aim and Objectives",
            "1.4 Significance of the Study",
            "1.5 Scope and Limitations",
            "1.6 Definition of Terms"
        ];
    }
}
