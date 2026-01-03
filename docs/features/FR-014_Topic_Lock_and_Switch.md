# FR-014: Topic Lock & Project Switch Rules

## Goal
Implement business rules to prevent account sharing while allowing legitimate topic changes.
This system ensures that:
1.  Users commit to a topic before paying.
2.  Users cannot abuse the system by creating unlimited projects for different people under one account.
3.  Legitimate users (e.g., topic rejected by lecturer) have a path to switch topics either for free (with proof) or for a fee (if changing mind).

## User Review Required
> [!IMPORTANT]
> **Schema Changes**: This feature introduces a new `isLocked` field on the `Project` model and a new `TopicSwitchRequest` model.
> **Blocking Behavior**: Once a project is paid and locked, users will be **blocked** from creating new projects and from navigating back to the topic selection screen in the builder.

## Proposed Changes

### Database Schema
#### [MODIFY] [schema.prisma](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/prisma/schema.prisma)
- Add `isLocked` (Boolean) and `lockedAt` (DateTime) to `Project` model.
- Create `TopicSwitchRequest` model to track switch requests.

### Backend Logic
#### [MODIFY] [projects.service.ts](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/src/services/projects.service.ts)
- Modify `createProject`: Check if user already has a locked project. If so, throw strict error.
- New method `lockProject(projectId)`: Sets `isLocked = true`. Called after successful payment.

#### [NEW] [topic-switch.service.ts](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/src/services/topic-switch.service.ts)
- `createRequest(userId, projectId, reason, proof?)`
- `reviewRequest(requestId, status, adminId)`
- `processSwitch(projectId)`: Unlocks project.

#### [MODIFY] [billing.service.ts](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/src/services/billing.service.ts)
- In `recordPayment`: Call `projectsService.lockProject(projectId)` immediately after payment success.

### UI Components
#### [MODIFY] [BuilderClient.tsx](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/src/features/builder/components/BuilderClient.tsx)
- **Navigation Lock**: Disables "Back" navigation when the project is locked to prevent accidental topic changes after payment.

#### [MODIFY] [ChapterOutliner.tsx](file:///c:/CreativeOS/01_Projects/Code/Personal_Stuff/Final%20Year%20Project%20service/2025-12-15_jstar-fyb-service/src/features/builder/components/ChapterOutliner.tsx)
- **Navigation Recovery**: Added a "Change Topic" link that allows users to loop back to Step 1. This is critical for users whose topic switch request was approved (leaving the project in an unlocked but previously "Generated" state).

### Proof of Rejection Implementation
To minimize infrastructure dependencies, "Proof" for topic switch requests is handled as follows:
- **Client**: `TopicSwitchRequestForm` converts the uploaded image (max 2MB) to a **Base64 Data URL** using `FileReader`.
- **Database**: The Base64 string is stored directly in the `proofUrl` field of the `TopicSwitchRequest` model.
- **Admin**: `ProofModal` renders the Base64 string in a dialog popup to avoid browser "About:Blank" blocks on direct Data URL navigation.

## Verification Plan

### Automated Tests
- **Unit Tests**:
    - Test `createProject` throws if user has locked project.
    - Test `lockProject` updates DB correctly.
    - Test `TopicSwitchRequest` creation.

### Manual Verification
1.  **New User Flow**:
    - Create project -> Select Topic -> Try to Pay.
    - Verify Lock Warning Modal appears.
    - Pay -> Verify Project is `isLocked`.
    - Try to create NEW project -> Expect Error/Block.
2.  **Switch Flow**:
    - Go to Settings/Support.
    - Request Switch (Reason: Lecturer Rejected).
    - Mock Admin Approval.
    - Verify Project is unlocked.
