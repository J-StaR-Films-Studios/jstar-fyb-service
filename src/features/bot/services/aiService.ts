import { prisma } from '@/lib/prisma';
import { AnalysisResult } from './mockAi';

export interface TopicAnalysis {
    topic: string;
    department: string;
    complexity: number;
    twist: string;
    reasoning: string[];
    confidence: number;
}

export class AiService {
    /**
     * Analyze a project idea and provide intelligent suggestions based on historical data
     */
    static async analyzeIdea(text: string): Promise<AnalysisResult> {
        const lowerText = text.toLowerCase();

        // First, try to find similar topics in the database
        const similarLeads = await this.findSimilarLeads(lowerText);

        if (similarLeads.length > 0) {
            // Use historical data to inform the response
            return this.generateSmartResponseFromHistory(text, similarLeads);
        } else {
            // Fall back to keyword-based analysis with database insights
            return this.generateKeywordBasedResponse(text);
        }
    }

    /**
     * Find similar leads in the database based on topic similarity
     */
    private static async findSimilarLeads(text: string): Promise<any[]> {
        try {
            // Use PostgreSQL full-text search for better matching
            // Note: removed mode: 'insensitive' as it is not supported in some Prisma/DB configurations
            const similarLeads = await prisma.lead.findMany({
                where: {
                    OR: [
                        {
                            topic: {
                                contains: text
                            }
                        },
                        {
                            twist: {
                                contains: text
                            }
                        }
                    ]
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 5 // Get up to 5 similar leads
            });

            return similarLeads;
        } catch (error) {
            console.error('[AiService] Error finding similar leads:', error);
            return [];
        }
    }

    /**
     * Generate response based on historical data from similar projects
     */
    private static generateSmartResponseFromHistory(text: string, similarLeads: any[]): AnalysisResult {
        // Analyze patterns from similar leads
        const departments = similarLeads.map(lead => lead.department);
        const complexities = similarLeads.map(lead => lead.complexity);
        const twists = similarLeads.map(lead => lead.twist);

        // Find most common department
        const department = this.getMostCommon(departments) || this.detectDepartment(text);

        // Calculate average complexity with some variation
        const avgComplexity = Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length);
        const complexity = Math.max(1, Math.min(5, avgComplexity + Math.floor(Math.random() * 2) - 1));

        // Generate twist based on patterns
        const twist = this.generateTwistFromPatterns(text, twists);

        // Generate reasoning based on historical success patterns
        const reasoning = this.generateReasoningFromHistory(text, department, complexity);

        return {
            twist,
            complexity: complexity as 1 | 2 | 3 | 4 | 5,
            department,
            reasoning
        };
    }

    /**
     * Generate response based on keyword analysis when no historical data is available
     */
    private static generateKeywordBasedResponse(text: string): AnalysisResult {
        const lowerText = text.toLowerCase();

        // Department detection
        const department = this.detectDepartment(text);

        // Keyword-based twist generation
        let twist: string;
        let complexity: number;
        let reasoning: string[];

        if (lowerText.includes("crypto") || lowerText.includes("blockchain")) {
            twist = "Blockchain-Based Fake News Detector";
            complexity = 4;
            reasoning = [
                "Leverages blockchain's immutable ledger for content verification",
                "Addresses growing concerns about misinformation online",
                "Combines cutting-edge technology with social impact"
            ];
        } else if (lowerText.includes("hospital") || lowerText.includes("healthcare") || lowerText.includes("medical")) {
            twist = "AI-Powered Patient Triage System";
            complexity = 3;
            reasoning = [
                "Uses machine learning to prioritize patient care effectively",
                "Addresses critical healthcare resource allocation challenges",
                "Demonstrates practical AI application in life-saving scenarios"
            ];
        } else if (lowerText.includes("e-commerce") || lowerText.includes("shop") || lowerText.includes("marketplace")) {
            twist = "Decentralized Marketplace with AI Recommendations";
            complexity = 5;
            reasoning = [
                "Combines Web3 decentralization with intelligent recommendation systems",
                "Addresses trust and personalization challenges in online marketplaces",
                "Showcases advanced distributed systems knowledge"
            ];
        } else if (lowerText.includes("education") || lowerText.includes("learning") || lowerText.includes("school")) {
            twist = "Adaptive Learning Platform with Real-time Analytics";
            complexity = 3;
            reasoning = [
                "Personalizes education through AI-driven content adaptation",
                "Provides valuable insights for educators and administrators",
                "Addresses diverse learning needs in modern education"
            ];
        } else if (lowerText.includes("banking") || lowerText.includes("finance") || lowerText.includes("payment")) {
            twist = "Fraud Detection System using Machine Learning";
            complexity = 4;
            reasoning = [
                "Addresses critical security concerns in financial transactions",
                "Demonstrates advanced data analysis and pattern recognition",
                "Has significant real-world impact and industry relevance"
            ];
        } else {
            // Default fallback
            twist = "Smart Campus IoT Attendance System";
            complexity = 3;
            reasoning = [
                "Solves a real problem on campus with modern technology",
                "Hardware + Software integration demonstrates comprehensive skills",
                "Can be implemented with available campus infrastructure"
            ];
        }

        return {
            twist,
            complexity: complexity as 1 | 2 | 3 | 4 | 5,
            department,
            reasoning
        };
    }

    /**
     * Detect department based on keywords in the text
     */
    private static detectDepartment(text: string): string {
        const lowerText = text.toLowerCase();

        const departmentKeywords: Record<string, string[]> = {
            "Computer Science": ["programming", "software", "algorithm", "data", "web", "app", "system", "network", "security", "ai", "machine learning", "blockchain", "database"],
            "Business Administration": ["business", "management", "marketing", "finance", "accounting", "entrepreneurship", "strategy", "operations", "human resources"],
            "Law": ["legal", "law", "justice", "court", "contract", "regulation", "compliance", "policy", "legislation"],
            "Nursing": ["health", "medical", "patient", "care", "hospital", "clinical", "treatment", "diagnosis", "therapy"],
            "Mechanical Engineering": ["mechanical", "engineering", "design", "manufacturing", "automotive", "robotics", "thermodynamics", "materials"],
            "Electrical Engineering": ["electrical", "electronics", "circuit", "power", "communication", "signal", "control", "embedded"],
            "Civil Engineering": ["civil", "construction", "structural", "infrastructure", "transportation", "geotechnical", "environmental"],
            "Education": ["education", "teaching", "learning", "curriculum", "pedagogy", "assessment", "instructional"],
            "Medicine": ["medicine", "clinical", "diagnosis", "treatment", "pharmacology", "anatomy", "physiology"]
        };

        for (const [department, keywords] of Object.entries(departmentKeywords)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return department;
            }
        }

        // Default to Computer Science if no match found
        return "Computer Science";
    }

    /**
     * Generate twist based on patterns from similar projects
     */
    private static generateTwistFromPatterns(text: string, existingTwists: string[]): string {
        if (existingTwists.length === 0) {
            return this.generateDefaultTwist(text);
        }

        // Find the most common words in existing twists
        const wordFrequency = new Map<string, number>();

        existingTwists.forEach(twist => {
            const words = twist.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3) { // Only consider meaningful words
                    wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
                }
            });
        });

        // Get most common words
        const sortedWords = Array.from(wordFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);

        // Generate twist using common patterns
        const baseTwist = this.generateDefaultTwist(text);

        // Try to incorporate common words if they make sense
        if (sortedWords.length > 0) {
            return `${baseTwist} with ${sortedWords[0].charAt(0).toUpperCase() + sortedWords[0].slice(1)} Integration`;
        }

        return baseTwist;
    }

    /**
     * Generate default twist when no patterns are available
     */
    private static generateDefaultTwist(text: string): string {
        const lowerText = text.toLowerCase();

        if (lowerText.includes("system") || lowerText.includes("platform")) {
            return "Smart " + text.replace(/system|platform/i, "").trim() + " Management System";
        } else if (lowerText.includes("analysis") || lowerText.includes("detection")) {
            return "Intelligent " + text.replace(/analysis|detection/i, "").trim() + " Analysis System";
        } else {
            return "Advanced " + text + " Solution";
        }
    }

    /**
     * Generate reasoning based on historical patterns
     */
    private static generateReasoningFromHistory(text: string, department: string, complexity: number): string[] {
        const baseReasoning = [
            "Leverages modern technologies relevant to the field",
            "Addresses a real-world problem with practical applications",
            "Demonstrates comprehensive understanding of the subject matter"
        ];

        // Add department-specific reasoning
        const departmentReasoning: Record<string, string> = {
            "Computer Science": "Showcases strong programming and system design skills",
            "Business Administration": "Demonstrates business acumen and strategic thinking",
            "Law": "Addresses important legal and regulatory considerations",
            "Nursing": "Contributes to improved patient care and healthcare outcomes",
            "Engineering": "Applies engineering principles to solve practical problems"
        };

        if (departmentReasoning[department]) {
            baseReasoning.push(departmentReasoning[department]);
        }

        // Add complexity-based reasoning
        if (complexity >= 4) {
            baseReasoning.push("Incorporates advanced concepts and cutting-edge technologies");
        } else if (complexity <= 2) {
            baseReasoning.push("Provides a solid foundation with room for future enhancement");
        }

        return baseReasoning;
    }

    /**
     * Get the most common value from an array
     */
    private static getMostCommon(values: any[]): any {
        if (values.length === 0) return null;

        const frequency = new Map<any, number>();
        values.forEach(value => {
            frequency.set(value, (frequency.get(value) || 0) + 1);
        });

        let mostCommon = values[0];
        let maxCount = 0;

        frequency.forEach((count, value) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = value;
            }
        });

        return mostCommon;
    }

    /**
     * Store analysis result in database for future learning
     */
    static async storeAnalysisResult(
        topic: string,
        department: string,
        complexity: number,
        twist: string
    ): Promise<void> {
        try {
            await prisma.lead.create({
                data: {
                    topic,
                    department,
                    complexity,
                    twist,
                    whatsapp: `ANON_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Required unique field
                    status: "NEW" // This will be updated when user provides contact info
                }
            });
        } catch (error) {
            console.error('[AiService] Error storing analysis result:', error);
        }
    }
}