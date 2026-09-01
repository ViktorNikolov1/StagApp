# StagApp

A private community platform for a university soccer program. StagApp provides a trusted digital hub for players, alumni, coaches, parents, and approved community members to stay connected, share updates, and coordinate activities.

**This is not a public social network.** There are no follower counts, algorithmic feeds, viral mechanics, or engagement farming. StagApp is designed for genuine community connection within a trusted, verified membership.

---

## Project Status

**Phase: Architecture & Design**

The project is in the spec-driven design phase. All foundational architecture, security requirements, data model, and API conventions have been documented. No production application code has been written yet.

**Next step:** Begin implementation starting with EPIC 1 (Project Foundation).

---

## Architecture Overview

| Layer | Technology |
|-------|-----------|
| Mobile | Expo (React Native) + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache | Redis |
| Background Jobs | BullMQ |
| Object Storage | S3-compatible (Cloudflare R2) |
| CI/CD | GitHub Actions |

**Key decisions:**
- Monolithic backend (no microservices)
- REST API (no GraphQL)
- Server-side authorization (client checks are cosmetic)
- Signed URLs for all media (no public storage)
- Role-based access control with admin-approved membership

For full details, see `ARCHITECTURE.md`.

---

## Repository Structure

```
StagApp/
├── ARCHITECTURE.md          # Technical architecture (source of truth)
├── SECURITY.md              # Security requirements and practices
├── REQUIREMENTS.md          # Structured requirements with IDs
├── CLAUDE.md                # AI agent operating manual
├── README.md                # This file
├── docs/
│   ├── DATA_MODEL.md        # Entity definitions and ER diagram
│   ├── API.md               # API conventions and endpoints
│   └── THREAT_MODEL.md      # STRIDE threat model
├── .claude/
│   ├── rules/
│   │   ├── code-style.md    # TypeScript and coding conventions
│   │   ├── security.md      # Mandatory security rules
│   │   ├── frontend.md      # Expo/React Native rules
│   │   └── backend.md       # NestJS rules
│   └── agents/
│       ├── code-reviewer.md     # Code review agent instructions
│       └── security-auditor.md  # Security audit agent instructions
├── .github/
│   └── ISSUE_TEMPLATE/
│       └── feature_request.yml  # Feature request template
├── apps/                    # (to be created)
│   ├── mobile/              # Expo app
│   └── api/                 # NestJS API
└── packages/                # (to be created)
    └── shared/              # Shared types and constants
```

---

## Development Philosophy

1. **Spec-driven development.** Every feature traces back to a documented requirement.
2. **Security by design.** Security is built into the architecture, not added after.
3. **Boring technology.** Prefer proven, maintainable tools over trendy ones.
4. **Small team optimization.** Architecture decisions favor simplicity and developer experience.
5. **Quality over speed.** No shortcuts on testing, authorization, or input validation.
6. **Challenge assumptions.** Every architectural decision includes documented tradeoffs.

---

## Documentation Hierarchy

| Document | Purpose | Audience |
|----------|---------|----------|
| `ARCHITECTURE.md` | System design and technical decisions | Developers, AI agents |
| `SECURITY.md` | Security requirements and practices | Developers, AI agents, reviewers |
| `REQUIREMENTS.md` | Feature requirements with acceptance criteria | Developers, product, AI agents |
| `CLAUDE.md` | AI coding agent operating manual | AI agents |
| `docs/DATA_MODEL.md` | Database entity definitions | Developers, AI agents |
| `docs/API.md` | API conventions and endpoints | Developers, AI agents |
| `docs/THREAT_MODEL.md` | Security threat analysis | Developers, security reviewers |
| `.claude/rules/*` | Coding rules by domain | AI agents |
| `.claude/agents/*` | Review agent instructions | AI agents |

---

## Development Workflow

### For Human Developers
1. Pick an issue from the backlog
2. Read the associated requirement(s) in `REQUIREMENTS.md`
3. Review relevant sections of `ARCHITECTURE.md` and `SECURITY.md`
4. Implement the smallest reasonable change
5. Write tests (happy path, errors, authorization, IDOR)
6. Submit PR for review

### For AI Coding Agents
1. Read `CLAUDE.md` first
2. Follow the checklist in `CLAUDE.md` for every change
3. Reference requirement IDs in commit messages
4. Run the security auditor agent on security-sensitive changes
5. Never bypass documented architecture or security controls

### Requirement-to-Implementation Flow
```
Requirement (REQUIREMENTS.md)
  → GitHub Issue (feature_request template)
    → Implementation (code + tests)
      → Code Review (code-reviewer agent)
        → Security Review (security-auditor agent)
          → Merge
```

---

## Current MVP Scope

The MVP enables:
- User registration with email verification
- Admin-approved membership verification
- User profiles and member directories
- Community feed with posts and photo attachments
- Comments and reactions on posts
- Event/game schedule management
- In-app notifications
- Content reporting and admin moderation
- Invitation system for onboarding

See `REQUIREMENTS.md` for all P0 requirements that define the MVP.
