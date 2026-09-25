# Project Requirements: J Star FYB Service

## Functional Requirements

| Requirement ID | Description | User Story | Expected Behavior / Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-001 | **Agency Landing Page (Marketing)** | As a visitor, I want to see a high-end, "sexy" landing page with 3D elements and scroll animations, so that I trust the agency's quality. | - Hero section with countdown<br>- Pricing Key Components<br>- Project Gallery<br>- Sticky CTA | MUS |
| FR-002 | **AI Sales Consultant (Bot)** | As a student with a vague idea, I want to chat with an AI that refines my idea and suggests a "twist", so that I can get approval. | - Chat interface in `/project/chat`<br>- Proposes topics<br>- Quantifies complexity<br>- Funnels to Lead Capture | MUS |
| FR-003 | **Lead Capture** | As the agency owner, I want to capture the phone numbers of interested students, so that I can close the sale manually. | - Bot asks for WhatsApp number<br>- Saves to DB<br>- Triggers notification (Discord/Telegram) | MUS |
| FR-004 | **SaaS Project Builder (Wizard)** | As a lower-budget student, I want a DIY tool to generate my project abstract and outline, so that I can start writing myself. | - Step 1: Topic Selection<br>- Step 2: Abstract Gen<br>- Step 3: Chapter 1 Outline<br>- Restricted access after Step 3 | MUS |
| FR-005 | **SaaS Paywall Logic** | As the business owner, I want to restrict full content generation behind a payment, so that I generate revenue. | - Blur content after Step 3<br>- Prompt for payment (₦15k) to unlock | MUS |
| FR-006 | **Payments Integration** | As a user, I want to pay via Paystack/Flutterwave, so that I can unlock the full SaaS features. | - Integration with Paystack/Flutterwave<br>- Webhook handling to update `hasPaid` status | Future |
| FR-007 | **Full Chapter Generation** | As a paid user, I want to generate full academic chapters (1-3) and code snippets, so that I save time. | - Generate verbose academic content<br>- Generate code boilerplate | Future |
| FR-008 | **Upsell Bridge** | As a stuck DIY user, I want to easily hire the agency to finish the code, so that I don't fail. | - "Stuck? Hire us" button in SaaS dashboard<br>- Connects to Agency sales flow | Future |

## Overview

This document outlines the functional and technical requirements for the J Star FYB Service, a comprehensive platform for final year students offering both agency services and DIY tools for project development.

## Functional Requirements

### 1. Agency Landing Page (FR-001)

**Priority**: High
**Status**: Complete

#### Requirements
- **FR-001-001**: Display high-impact landing page with "Overkill Sexy" design
- **FR-001-002**: Implement countdown timer for Christmas sale
- **FR-001-003**: Show pricing calculator with group size slider
- **FR-001-004**: Display project gallery with portfolio items
- **FR-001-005**: Include sticky CTA for chat consultation

#### Implementation
- **Files**: `src/app/(marketing)/page.tsx`, `src/features/marketing/components/`
- **Status**: ✅ Complete
- **Features**: Premium design, animations, responsive layout

### 2. AI Sales Consultant (FR-002)

**Priority**: High
**Status**: Complete

#### Requirements
- **FR-002-001**: Chat interface for project consultation
- **FR-002-002**: AI-powered topic suggestions and refinement
- **FR-002-003**: Lead capture with WhatsApp number collection
- **FR-002-004**: Project complexity assessment
- **FR-002-005**: Integration with payment system

#### Implementation
- **Files**: `src/features/bot/`, `src/app/api/chat/route.ts`
- **Status**: ✅ Complete
- **Features**: Real-time chat, AI consultation, lead capture

### 3. Lead Capture (FR-003)

**Priority**: High
**Status**: Complete

#### Requirements
- **FR-003-001**: Capture student contact information (WhatsApp)
- **FR-003-002**: Store project interests and topics
- **FR-003-003**: Link leads to WorkOS user accounts
- **FR-003-004**: Support anonymous lead capture
- **FR-003-005**: Database persistence with Prisma

#### Implementation
- **Files**: `prisma/schema.prisma`, `src/features/bot/actions/chat.ts`
- **Status**: ✅ Complete
- **Features**: Database integration, anonymous support, validation

### 4. SaaS Project Builder (FR-004)

**Priority**: High
**Status**: Complete

#### Requirements
- **FR-004-001**: Step-by-step project creation workflow
- **FR-004-002**: AI-powered content generation (abstract, outline, chapters)
- **FR-004-003**: Progress tracking and status updates
- **FR-004-004**: Payment integration for premium features
- **FR-004-005**: Document upload and processing

#### Implementation
- **Files**: `src/features/builder/`, `src/app/api/generate/`
- **Status**: ✅ Complete
- **Features**: Complete workflow, AI generation, progress tracking

### 5. Authentication System (FR-009)

**Priority**: Medium
**Status**: Complete

#### Requirements
- **FR-009-001**: User registration and login
- **FR-009-002**: WorkOS integration for enterprise authentication
- **FR-009-003**: Password reset functionality
- **FR-009-004**: Session management
- **FR-009-005**: Role-based access control

#### Implementation
- **Files**: `src/features/auth/`, `src/lib/auth.ts`
- **Status**: ✅ Complete
- **Features**: WorkOS integration, secure authentication

### 6. Agency Consultation Funnel (FR-010)

**Priority**: Medium
**Status**: Complete

#### Requirements
- **FR-010-001**: Dedicated consultation page
- **FR-010-002**: Project requirement gathering
- **FR-010-003**: Quote generation and approval
- **FR-010-004**: Integration with lead management
- **FR-010-005**: Payment processing for agency services

#### Implementation
- **Files**: `src/app/(saas)/project/consult/page.tsx`
- **Status**: ✅ Complete
- **Features**: Consultation workflow, quote generation

## Technical Requirements

### 1. Database Schema

#### Core Models
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  projects      Project[]
  leads         Lead[]
}

model Project {
  id                 String   @id @default(cuid())
  topic              String
  twist              String?
  abstract           String?
  progressPercentage Int      @default(0)
  contentProgress    Json?
  documentProgress   Json?
  aiGenerationStatus Json?
  timeTracking       Json?
  milestones         Json?
  estimatedCompletion DateTime?
  actualCompletion   DateTime?
  userId             String?
  user               User?    @relation(fields: [userId], references: [id])
  outline            ChapterOutline?
  documents          Document[]
  conversations      ProjectConversation[]
}

model Lead {
  id          String   @id @default(cuid())
  name        String?
  email       String?
  phone       String?
  topic       String?
  twist       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
}
```

### 2. API Endpoints

#### Content Generation
- `POST /api/generate/abstract` - Generate project abstract
- `POST /api/generate/outline` - Generate chapter outline
- `POST /api/generate/chapter` - Generate chapter content

#### Project Management
- `GET /api/projects/[id]/progress` - Get project progress
- `POST /api/projects/[id]/progress` - Update project progress
- `GET /api/projects/[id]/outline` - Get chapter outline
- `GET /api/projects/[id]/abstract` - Get project abstract
- `GET /api/projects/[id]/chapters` - Get chapter content

#### Chat and Communication
- `POST /api/chat` - Chat with AI consultant
- `POST /api/projects/[id]/chat` - Project-specific chat
- `GET /api/projects/[id]/messages` - Get chat history

#### Document Processing
- `POST /api/documents/upload` - Upload documents
- `GET /api/documents/[id]/extract` - Extract content from documents
- `GET /api/documents/[id]/serve` - Serve processed documents

### 3. Frontend Architecture

#### Component Structure
```
src/
├── app/
│   ├── (marketing)/     # Agency landing page
│   ├── (bot)/          # AI consultant
│   ├── (saas)/         # SaaS builder
│   └── api/            # API routes
├── features/
│   ├── auth/          # Authentication
│   ├── bot/           # Chat functionality
│   ├── builder/       # Project builder
│   ├── marketing/     # Landing page components
│   └── admin/         # Admin dashboard
├── components/        # Shared components
├── services/          # Business logic
└── lib/              # Utilities and configuration
```

#### State Management
- **Zustand**: For global state management
- **React Context**: For component-level state
- **Local Storage**: For temporary data persistence

### 4. AI Integration

#### Models and Providers
- **OpenRouter GPT-6 Luna**: Text, vision, tool calls and structured output, with reasoning effort selected by task
- **Google Gemini 2.5 Flash**: Native Google Search and File Search grounding for research and uploaded documents
- **Structured Output**: Using Zod schemas for consistent data

#### AI Services
```typescript
interface AiService {
  generateText(prompt: string): Promise<string>
  generateObject<T>(schema: z.ZodSchema<T>, prompt: string): Promise<T>
  streamText(prompt: string): AsyncGenerator<string>
  streamObject<T>(schema: z.ZodSchema<T>, prompt: string): AsyncGenerator<T>
}
```

### 5. Security Requirements

#### Authentication and Authorization
- **JWT Tokens**: For API authentication
- **Role-Based Access**: Different permissions for users and admins
- **Session Management**: Secure session handling

#### Data Protection
- **Input Validation**: Comprehensive validation using Zod
- **SQL Injection Prevention**: Prisma ORM protection
- **XSS Prevention**: Content sanitization

#### API Security
- **Rate Limiting**: Prevent abuse of API endpoints
- **CORS Configuration**: Proper cross-origin resource sharing
- **HTTPS Enforcement**: Secure communication

### 6. Performance Requirements

#### Frontend Performance
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Optimized image loading
- **Bundle Size**: Minimized JavaScript bundle size

#### Backend Performance
- **Database Indexing**: Optimized database queries
- **Caching Strategy**: Redis or similar for caching
- **CDN Integration**: Content delivery network for static assets

#### AI Performance
- **Streaming Responses**: Real-time content generation
- **Rate Limiting**: AI API call management
- **Fallback Mechanisms**: Graceful degradation

### 7. Scalability Requirements

#### Horizontal Scaling
- **Stateless Design**: API endpoints are stateless
- **Database Sharding**: Support for database scaling
- **Load Balancing**: Multiple server instances

#### Vertical Scaling
- **Resource Monitoring**: CPU, memory, and disk usage
- **Auto-scaling**: Automatic resource scaling based on load
- **Performance Metrics**: Real-time performance monitoring

## Non-Functional Requirements

### 1. Usability
- **Responsive Design**: Works on all device sizes
- **Accessibility**: WCAG 2.1 AA compliance
- **User Experience**: Intuitive and engaging interface

### 2. Reliability
- **Uptime**: 99.9% availability target
- **Error Handling**: Graceful error recovery
- **Data Backup**: Regular data backups

### 3. Maintainability
- **Code Quality**: Clean, well-documented code
- **Testing**: Comprehensive test coverage
- **Documentation**: Complete technical documentation

### 4. Security
- **Data Encryption**: Encryption at rest and in transit
- **Security Audits**: Regular security assessments
- **Compliance**: GDPR and other relevant regulations

## Implementation Status

### ✅ Complete
- Agency Landing Page (FR-001)
- AI Sales Consultant (FR-002)
- Lead Capture (FR-003)
- SaaS Project Builder (FR-004)
- Authentication System (FR-009)
- Agency Consultation Funnel (FR-010)

### 🔄 In Progress
- Payment Integration (Paystack)
- Document Processing (PDF extraction)
- Advanced Analytics

### ⏳ Future Enhancements
- Mobile App Development
- Advanced AI Features (RAG, Multi-modal)
- Team Collaboration Features
- Advanced Analytics and Reporting

## Success Criteria

### Business Metrics
- **User Acquisition**: Target number of registered users
- **Conversion Rate**: Percentage of leads converting to paying customers
- **Customer Satisfaction**: User feedback and ratings

### Technical Metrics
- **Page Load Time**: Under 3 seconds for all pages
- **API Response Time**: Under 500ms for most endpoints
- **Error Rate**: Less than 1% error rate

### Functional Metrics
- **Feature Completion**: 100% of core features implemented
- **Bug Count**: Less than 5 critical bugs in production
- **Test Coverage**: Over 80% code coverage

This comprehensive requirements document ensures that the J Star FYB Service meets both business objectives and technical standards while providing a solid foundation for future enhancements.
