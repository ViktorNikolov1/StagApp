# StagApp Requirements

> Structured requirements for StagApp.
> Every feature must trace back to a requirement ID.
> Priority: P0 = MVP, P1 = shortly after launch, P2 = future enhancement.

---

## MVP Definition

The MVP enables a verified community to:
1. Register and get approved
2. View and create posts with photos
3. Browse member profiles and directories
4. View events and game schedules
5. Comment and react to posts
6. Receive in-app notifications
7. Administer the community (approve members, moderate content)

**The MVP does NOT include:** direct messaging, push notifications, full-text search, private groups, payments, or web app.

---

## AUTH — Authentication

### REQ-AUTH-001: User Registration
- **Title:** Email/password registration
- **Description:** Users can create an account with email and password. Email must be verified before account activation.
- **User Story:** As a prospective member, I want to register with my email so I can join the community.
- **Priority:** P0
- **Dependencies:** None
- **Acceptance Criteria:**
  - User provides email, password, first name, last name
  - Password meets minimum requirements (10+ chars, not breached)
  - Verification email sent with single-use token
  - Account created in PENDING status
  - Duplicate email handled without revealing existence
- **Security Considerations:** Account enumeration prevention, password strength validation, rate limiting registration
- **Relevant Roles:** All
- **Expected Tests:** Happy path, duplicate email, weak password, invalid email, rate limit exceeded

### REQ-AUTH-002: Email Verification
- **Title:** Email address verification
- **Description:** Users must verify their email before proceeding with membership.
- **User Story:** As a new user, I want to verify my email to prove I own it.
- **Priority:** P0
- **Dependencies:** REQ-AUTH-001
- **Acceptance Criteria:**
  - Clicking verification link marks email as verified
  - Token expires after 24 hours
  - Token is single-use
  - User can request resend (rate limited)
- **Security Considerations:** Token randomness, expiry enforcement, rate limiting resend
- **Relevant Roles:** All
- **Expected Tests:** Valid token, expired token, reused token, resend rate limit

### REQ-AUTH-003: Login
- **Title:** Email/password login
- **Description:** Verified users can log in to receive access and refresh tokens.
- **User Story:** As a registered user, I want to log in to access the community.
- **Priority:** P0
- **Dependencies:** REQ-AUTH-001, REQ-AUTH-002
- **Acceptance Criteria:**
  - Valid credentials return access token + refresh token
  - Invalid credentials return generic error
  - Unverified email returns appropriate error
  - PENDING users can log in but have limited access
  - Failed attempts are rate limited
- **Security Considerations:** Brute force protection, account enumeration prevention, timing attack mitigation
- **Relevant Roles:** All
- **Expected Tests:** Valid login, wrong password, non-existent email, unverified email, rate limit, suspended account

### REQ-AUTH-004: Token Refresh
- **Title:** Access token refresh
- **Description:** Clients can use refresh tokens to obtain new access tokens without re-authentication.
- **User Story:** As a user, I want to stay logged in without re-entering my password frequently.
- **Priority:** P0
- **Dependencies:** REQ-AUTH-003
- **Acceptance Criteria:**
  - Valid refresh token returns new access + refresh token pair
  - Old refresh token is invalidated (rotation)
  - Expired refresh token returns 401
  - Revoked refresh token returns 401
- **Security Considerations:** Token rotation, revocation on password change, max concurrent tokens
- **Relevant Roles:** All
- **Expected Tests:** Valid refresh, expired token, revoked token, rotation

### REQ-AUTH-005: Logout
- **Title:** User logout
- **Description:** Users can log out, invalidating their current refresh token.
- **User Story:** As a user, I want to log out to secure my account.
- **Priority:** P0
- **Dependencies:** REQ-AUTH-003
- **Acceptance Criteria:**
  - Current refresh token invalidated
  - Access token continues to work until expiry (stateless)
  - Client clears local token storage
- **Security Considerations:** Ensure refresh token is properly invalidated server-side
- **Relevant Roles:** All
- **Expected Tests:** Successful logout, refresh token no longer works after logout

### REQ-AUTH-006: Password Reset
- **Title:** Forgot password flow
- **Description:** Users can reset their password via email.
- **User Story:** As a user who forgot my password, I want to reset it via email.
- **Priority:** P0
- **Dependencies:** REQ-AUTH-001
- **Acceptance Criteria:**
  - User submits email, receives reset link (if account exists)
  - Reset token expires in 1 hour
  - Successful reset invalidates all refresh tokens
  - Generic response regardless of email existence
- **Security Considerations:** Account enumeration prevention, token expiry, invalidate sessions after reset
- **Relevant Roles:** All
- **Expected Tests:** Valid reset, expired token, non-existent email (still returns success), password validation

---

## USER — User Management

### REQ-USER-001: User Profile
- **Title:** User profile with basic information
- **Description:** Every user has a profile with name, bio, avatar, and role-specific fields.
- **User Story:** As a member, I want a profile that represents me in the community.
- **Priority:** P0
- **Dependencies:** REQ-AUTH-001
- **Acceptance Criteria:**
  - Profile includes: display name, first/last name, bio, avatar, role, graduation year (if applicable), position (if player/alumni)
  - Users can edit their own profile
  - Profile photo upload with size/type validation
- **Security Considerations:** Users can only edit their own profile (IDOR prevention), input validation, avatar upload security
- **Relevant Roles:** All
- **Expected Tests:** View own profile, edit own profile, attempt to edit another's profile (403), upload avatar, invalid file type

### REQ-USER-002: View Other Profiles
- **Title:** View community member profiles
- **Description:** Verified members can view other members' public profiles.
- **User Story:** As a member, I want to view other members' profiles to learn about them.
- **Priority:** P0
- **Dependencies:** REQ-USER-001, REQ-MEMBER-001
- **Acceptance Criteria:**
  - Only ACTIVE members can view other profiles
  - Public profile fields: display name, avatar, role, bio, graduation year, position
  - Private fields (email, phone) not exposed to other users
- **Security Considerations:** Enforce membership status check, field-level access control
- **Relevant Roles:** Player, Alumni, Coach, Parent, Admin
- **Expected Tests:** Active member views profile, pending user denied, field visibility

### REQ-USER-003: Account Deletion
- **Title:** User account deletion
- **Description:** Users can request deletion of their account.
- **User Story:** As a user, I want to delete my account and data when I leave the community.
- **Priority:** P1
- **Dependencies:** REQ-USER-001
- **Acceptance Criteria:**
  - User confirms deletion with password
  - Account soft-deleted immediately (30-day grace period)
  - All refresh tokens revoked
  - After 30 days, hard delete user data and media
  - User's posts/comments anonymized ("Deleted User")
- **Security Considerations:** Require password confirmation, audit log entry, complete data removal
- **Relevant Roles:** All
- **Expected Tests:** Successful deletion, wrong password, re-login during grace period

---

## MEMBER — Membership & Verification

### REQ-MEMBER-001: Membership Verification
- **Title:** Admin-approved membership
- **Description:** New users must be verified and approved by an admin before accessing community content.
- **User Story:** As a new user, I want to submit my membership request so an admin can verify I belong to the community.
- **Priority:** P0
- **Dependencies:** REQ-AUTH-002
- **Acceptance Criteria:**
  - After email verification, user completes membership form (role claim, connection to program)
  - Admin sees pending members in queue
  - Admin can approve or deny with optional message
  - On approval, user status changes to ACTIVE and role is assigned
  - On denial, user is notified and can re-apply
- **Security Considerations:** Coaches and admins require manual verification, prevent role self-assignment
- **Relevant Roles:** All (as applicants), Admin (as approver)
- **Expected Tests:** Submit verification, admin approve, admin deny, pending user access restrictions

### REQ-MEMBER-002: Invitation System
- **Title:** Member invitations
- **Description:** Admins and coaches can generate invitation links/codes for prospective members.
- **User Story:** As a coach, I want to invite new players and their families to join the platform.
- **Priority:** P0
- **Dependencies:** REQ-MEMBER-001
- **Acceptance Criteria:**
  - Admins/coaches can generate invitation codes (single-use or multi-use with limit)
  - Invitation can specify suggested role
  - Using an invitation code auto-fills parts of the verification form
  - Invitation still requires admin approval for Coach/Admin roles
  - Invitations have configurable expiry
- **Security Considerations:** Rate limit invitation generation, invitation code entropy, track invitation chains
- **Relevant Roles:** Admin, Coach
- **Expected Tests:** Create invitation, use invitation, expired invitation, used-up invitation

### REQ-MEMBER-003: Member Suspension
- **Title:** Suspend member account
- **Description:** Admins can suspend a member's account, revoking access immediately.
- **User Story:** As an admin, I want to suspend a member who violates community guidelines.
- **Priority:** P0
- **Dependencies:** REQ-MEMBER-001
- **Acceptance Criteria:**
  - Admin can suspend with reason
  - All refresh tokens revoked immediately
  - Suspended user cannot access community content
  - Admin can reinstate suspended user
  - Suspension and reinstatement are audit logged
- **Security Considerations:** Immediate token revocation, audit logging
- **Relevant Roles:** Admin
- **Expected Tests:** Suspend user, suspended user denied access, reinstate user

---

## PROFILE — Directories

### REQ-PROFILE-001: Player Directory
- **Title:** Directory of current players
- **Description:** Verified members can browse a directory of current players.
- **User Story:** As a member, I want to browse the player roster to see who is on the team.
- **Priority:** P0
- **Dependencies:** REQ-USER-001, REQ-MEMBER-001
- **Acceptance Criteria:**
  - List of users with Player role
  - Filterable by position, graduation year
  - Shows avatar, name, position, number, graduation year
  - Only accessible to ACTIVE members
- **Security Considerations:** Membership status enforcement, no private data exposure
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** List players, filter by position, pending user denied

### REQ-PROFILE-002: Alumni Directory
- **Title:** Directory of alumni
- **Description:** Verified members can browse a directory of program alumni.
- **User Story:** As a member, I want to find alumni of the program.
- **Priority:** P0
- **Dependencies:** REQ-USER-001, REQ-MEMBER-001
- **Acceptance Criteria:**
  - List of users with Alumni role
  - Filterable by graduation year
  - Shows avatar, name, graduation year, current city (if provided)
- **Security Considerations:** Same as REQ-PROFILE-001
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** List alumni, filter by year

### REQ-PROFILE-003: Coach Profiles
- **Title:** Coach profiles
- **Description:** Coach profiles are visible in the community with coaching-specific information.
- **User Story:** As a member, I want to view coach profiles and their roles.
- **Priority:** P0
- **Dependencies:** REQ-USER-001, REQ-MEMBER-001
- **Acceptance Criteria:**
  - Coach profiles show title, bio, years with program
  - Visible to all ACTIVE members
- **Security Considerations:** Same as REQ-PROFILE-001
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** View coach profile

---

## POST — Community Posts

### REQ-POST-001: Create Post
- **Title:** Create community post
- **Description:** Active members can create text posts, optionally with attached photos.
- **User Story:** As a member, I want to share updates with the community.
- **Priority:** P0
- **Dependencies:** REQ-MEMBER-001, REQ-MEDIA-001
- **Acceptance Criteria:**
  - Post includes text body (1-5000 chars) and optional media attachments (up to 10 images)
  - Post attributed to creating user
  - Post visible to all ACTIVE members
  - Post appears in community feed
- **Security Considerations:** Input validation, media upload security, ownership tracking
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Create text post, create post with images, exceed character limit, pending user denied

### REQ-POST-002: View Feed
- **Title:** Community feed
- **Description:** Active members can view a chronological feed of community posts.
- **User Story:** As a member, I want to see what's happening in the community.
- **Priority:** P0
- **Dependencies:** REQ-POST-001
- **Acceptance Criteria:**
  - Posts displayed in reverse chronological order
  - Cursor-based pagination
  - Shows post content, author, timestamp, reaction count, comment count
  - Pinned announcements at top (by coaches/admins)
- **Security Considerations:** Only ACTIVE members, no algorithmic manipulation
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Load feed, paginate, pinned post ordering

### REQ-POST-003: Delete Post
- **Title:** Delete own post
- **Description:** Users can delete their own posts. Admins can delete any post.
- **User Story:** As a member, I want to remove a post I no longer want visible.
- **Priority:** P0
- **Dependencies:** REQ-POST-001
- **Acceptance Criteria:**
  - Author can delete own post
  - Admin can delete any post (with reason)
  - Soft delete (content hidden, record retained)
  - Associated media marked for cleanup
- **Security Considerations:** Ownership verification (IDOR prevention), admin audit logging
- **Relevant Roles:** Post author, Admin
- **Expected Tests:** Delete own post, admin delete post, attempt delete other's post (403)

### REQ-POST-004: Pin Announcement
- **Title:** Pin post as announcement
- **Description:** Coaches and admins can pin posts to the top of the feed.
- **User Story:** As a coach, I want to pin important announcements so all members see them first.
- **Priority:** P0
- **Dependencies:** REQ-POST-001
- **Acceptance Criteria:**
  - Coach/admin can pin/unpin any post
  - Maximum 3 pinned posts at a time
  - Pinned posts display at top of feed with visual indicator
- **Security Considerations:** Role-based authorization (coach/admin only)
- **Relevant Roles:** Coach, Admin
- **Expected Tests:** Pin post, unpin post, player attempts pin (403), max pins exceeded

---

## MEDIA — Media Management

### REQ-MEDIA-001: Image Upload
- **Title:** Upload images
- **Description:** Users can upload images for posts and profile avatars.
- **User Story:** As a member, I want to share photos with the community.
- **Priority:** P0
- **Dependencies:** REQ-MEMBER-001
- **Acceptance Criteria:**
  - Supported formats: JPEG, PNG, WebP, HEIC
  - Max size: 10 MB per image (5 MB for avatars)
  - Server validates MIME type by magic bytes
  - EXIF metadata stripped
  - Random filename generated
  - Image resized to thumbnail (200px), medium (800px), full (2000px)
  - Served via signed URLs
- **Security Considerations:** File type validation, EXIF stripping, signed URLs, malware scanning (future)
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Upload JPEG, upload PNG, reject executable, reject oversized, EXIF stripped

### REQ-MEDIA-002: Video Upload
- **Title:** Upload videos
- **Description:** Users can upload short videos attached to posts.
- **User Story:** As a member, I want to share game clips and highlights.
- **Priority:** P1
- **Dependencies:** REQ-MEDIA-001
- **Acceptance Criteria:**
  - Supported formats: MP4, MOV
  - Max size: 100 MB
  - Server validates file type
  - Served via signed URLs
  - Thumbnail generated from first frame
- **Security Considerations:** Same as images plus video-specific validation
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Upload MP4, reject oversized, reject unsupported format

### REQ-MEDIA-003: Media Gallery
- **Title:** Browse media gallery
- **Description:** Members can browse photos and videos shared in the community.
- **User Story:** As a member, I want to browse all photos from the community.
- **Priority:** P1
- **Dependencies:** REQ-MEDIA-001
- **Acceptance Criteria:**
  - Grid view of community media
  - Filterable by date, author
  - Full-screen media viewer
  - Only accessible to ACTIVE members
- **Security Considerations:** Membership enforcement, signed URLs for all media
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Browse gallery, filter, pagination

---

## COMMENT — Comments

### REQ-COMMENT-001: Add Comment
- **Title:** Comment on a post
- **Description:** Active members can comment on community posts.
- **User Story:** As a member, I want to comment on posts to engage with the community.
- **Priority:** P0
- **Dependencies:** REQ-POST-001
- **Acceptance Criteria:**
  - Comment body: 1-2000 characters
  - Comment attributed to author
  - Comment count updates on post
  - Notification sent to post author
- **Security Considerations:** Input validation, ownership tracking, rate limiting
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Add comment, exceed length, pending user denied

### REQ-COMMENT-002: Delete Comment
- **Title:** Delete comment
- **Description:** Users can delete their own comments. Admins can delete any comment.
- **User Story:** As a member, I want to remove a comment I posted.
- **Priority:** P0
- **Dependencies:** REQ-COMMENT-001
- **Acceptance Criteria:**
  - Author can delete own comment
  - Admin can delete any comment
  - Soft delete
- **Security Considerations:** IDOR prevention, admin audit logging
- **Relevant Roles:** Comment author, Admin
- **Expected Tests:** Delete own comment, admin delete, attempt delete other's (403)

---

## REACTION — Reactions

### REQ-REACTION-001: React to Post
- **Title:** React to a community post
- **Description:** Members can add a reaction to a post (simple set of reaction types).
- **User Story:** As a member, I want to react to posts to show my engagement.
- **Priority:** P0
- **Dependencies:** REQ-POST-001
- **Acceptance Criteria:**
  - Reaction types: like, celebrate, support (small fixed set)
  - One reaction per user per post (can change type)
  - Reaction count visible on post (total count, not individual names in feed)
  - Toggle behavior: reacting again removes the reaction
- **Security Considerations:** Rate limiting, one-per-user enforcement
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Add reaction, change reaction, remove reaction, duplicate prevention

---

## NOTIFICATION — Notifications

### REQ-NOTIFICATION-001: In-App Notifications
- **Title:** In-app notification system
- **Description:** Users receive in-app notifications for relevant activity.
- **User Story:** As a member, I want to be notified when someone interacts with my content.
- **Priority:** P0
- **Dependencies:** REQ-POST-001, REQ-COMMENT-001
- **Acceptance Criteria:**
  - Notification types: comment on your post, reaction on your post, membership approved, new announcement, event reminder
  - Unread notification count badge
  - Mark as read (individual and all)
  - Notification list with pagination
- **Security Considerations:** Users can only see their own notifications (IDOR prevention), notification fan-out via background jobs
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Receive notification, mark read, pagination, user can only see own

### REQ-NOTIFICATION-002: Push Notifications
- **Title:** Mobile push notifications
- **Description:** Users receive push notifications for important activity.
- **User Story:** As a member, I want to be notified on my phone even when the app is closed.
- **Priority:** P1
- **Dependencies:** REQ-NOTIFICATION-001
- **Acceptance Criteria:**
  - Push notifications for: new announcements, comments on your posts, membership approved
  - User can configure notification preferences (per type)
  - Push token registration and management
  - No sensitive content in push notification preview
- **Security Considerations:** Push token management, no PII in notification payload, preference enforcement
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Register push token, receive push, preference toggle, uninstall cleanup

---

## EVENT — Events & Schedules

### REQ-EVENT-001: Create Event
- **Title:** Create community event
- **Description:** Coaches and admins can create events (games, practices, community events).
- **User Story:** As a coach, I want to create game and practice events for the team.
- **Priority:** P0
- **Dependencies:** REQ-MEMBER-001
- **Acceptance Criteria:**
  - Event fields: title, description, date/time, end time, location, event type (game/practice/social/other)
  - Only coaches and admins can create events
  - Events visible to all ACTIVE members
- **Security Considerations:** Role-based creation authorization
- **Relevant Roles:** Coach, Admin (create); All ACTIVE (view)
- **Expected Tests:** Create event, player attempts create (403), view events

### REQ-EVENT-002: View Events
- **Title:** Event listing and calendar
- **Description:** Members can view upcoming and past events.
- **User Story:** As a member, I want to see the team's schedule.
- **Priority:** P0
- **Dependencies:** REQ-EVENT-001
- **Acceptance Criteria:**
  - List view of upcoming events (chronological)
  - Event detail view
  - Filter by event type
  - Past events accessible
- **Security Considerations:** Membership status enforcement
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** List events, filter by type, view event detail

### REQ-EVENT-003: Event Reminders
- **Title:** Event reminder notifications
- **Description:** Members receive a notification before upcoming events.
- **User Story:** As a member, I want to be reminded of upcoming games and events.
- **Priority:** P1
- **Dependencies:** REQ-EVENT-001, REQ-NOTIFICATION-001
- **Acceptance Criteria:**
  - In-app notification 24 hours before event
  - Push notification (when push is implemented)
  - Triggered by background job
- **Security Considerations:** Ensure reminders only go to ACTIVE members
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Reminder created for upcoming event, no reminder for past events

---

## SEARCH — Search

### REQ-SEARCH-001: Member Search
- **Title:** Search member directory
- **Description:** Members can search for other members by name.
- **User Story:** As a member, I want to find specific people in the community.
- **Priority:** P0
- **Dependencies:** REQ-PROFILE-001
- **Acceptance Criteria:**
  - Search by name (first, last, display name)
  - Results show avatar, name, role
  - Only returns ACTIVE members
  - Simple ILIKE query (not full-text search)
- **Security Considerations:** Only return ACTIVE members, rate limiting, no private field exposure
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Search by name, no results, pending users excluded from results

### REQ-SEARCH-002: Full-Text Search
- **Title:** Search posts and content
- **Description:** Members can search across posts, events, and profiles.
- **User Story:** As a member, I want to find specific content in the community.
- **Priority:** P2
- **Dependencies:** REQ-SEARCH-001
- **Acceptance Criteria:**
  - Search across posts, events, profiles
  - Relevance ranking
  - Result previews with highlighted matches
- **Security Considerations:** Only return content accessible to the user, rate limiting
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Search posts, search events, no access to deleted content

---

## MESSAGE — Direct Messaging

### REQ-MESSAGE-001: Direct Messages
- **Title:** One-on-one messaging
- **Description:** Members can send direct messages to other members.
- **User Story:** As a member, I want to privately message another member.
- **Priority:** P2
- **Dependencies:** REQ-MEMBER-001
- **Acceptance Criteria:**
  - Create conversation with another ACTIVE member
  - Send text messages within conversation
  - Real-time delivery via WebSocket
  - Message history with pagination
  - Unread message count
- **Security Considerations:** Only participants can access conversation, message privacy, abuse reporting
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Create conversation, send message, non-participant denied access, real-time delivery

### REQ-MESSAGE-002: Group Conversations
- **Title:** Group messaging
- **Description:** Members can create group conversations.
- **User Story:** As a coach, I want to message all team captains at once.
- **Priority:** P2
- **Dependencies:** REQ-MESSAGE-001
- **Acceptance Criteria:**
  - Create group with multiple ACTIVE members
  - Group name and optional avatar
  - Same functionality as direct messages
  - Member management (add/remove by creator)
- **Security Considerations:** Only members can access, member management authorization
- **Relevant Roles:** All ACTIVE members
- **Expected Tests:** Create group, add member, remove member, non-member denied

---

## ADMIN — Administration

### REQ-ADMIN-001: Member Management
- **Title:** Admin member management
- **Description:** Admins can view, approve, deny, and suspend members.
- **User Story:** As an admin, I want to manage community membership.
- **Priority:** P0
- **Dependencies:** REQ-MEMBER-001
- **Acceptance Criteria:**
  - View pending membership requests
  - Approve/deny with optional message
  - Suspend/reinstate members
  - Change member roles
  - All actions audit logged
- **Security Considerations:** Admin-only access, audit logging, prevent self-demotion edge cases
- **Relevant Roles:** Admin
- **Expected Tests:** Approve member, deny member, suspend, reinstate, role change, non-admin denied

### REQ-ADMIN-002: Content Moderation
- **Title:** Admin content moderation
- **Description:** Admins can review and remove flagged or inappropriate content.
- **User Story:** As an admin, I want to remove content that violates community guidelines.
- **Priority:** P0
- **Dependencies:** REQ-POST-001, REQ-COMMENT-001
- **Acceptance Criteria:**
  - View reported/flagged content queue
  - Remove posts or comments with reason
  - All moderation actions audit logged
  - Notification to content author (optional)
- **Security Considerations:** Admin-only access, audit logging, reason tracking
- **Relevant Roles:** Admin
- **Expected Tests:** View flagged content, remove post, remove comment, audit log created

### REQ-ADMIN-003: Content Reporting
- **Title:** Report content or users
- **Description:** Members can flag posts, comments, or users for admin review.
- **User Story:** As a member, I want to report inappropriate content to admins.
- **Priority:** P0
- **Dependencies:** REQ-POST-001
- **Acceptance Criteria:**
  - Report button on posts, comments, and user profiles
  - Report includes reason (predefined categories + optional text)
  - Reports visible to admins in moderation queue
  - Prevent duplicate reports from same user
- **Security Considerations:** Rate limiting reports, prevent report abuse, reporter privacy
- **Relevant Roles:** All ACTIVE members (report); Admin (review)
- **Expected Tests:** Report post, report user, duplicate report prevented, admin views queue

---

## SECURITY — Cross-Cutting Security Requirements

### REQ-SECURITY-001: Rate Limiting
- **Title:** API rate limiting
- **Description:** All API endpoints are rate limited to prevent abuse.
- **Priority:** P0
- **Dependencies:** None
- **Acceptance Criteria:** See rate limit table in SECURITY.md
- **Expected Tests:** Exceed rate limit returns 429, rate limit resets after window

### REQ-SECURITY-002: Input Validation
- **Title:** Server-side input validation
- **Description:** All user input is validated server-side via DTOs.
- **Priority:** P0
- **Dependencies:** None
- **Acceptance Criteria:** See validation rules in SECURITY.md
- **Expected Tests:** Invalid input returns 400 with field-level errors

### REQ-SECURITY-003: Audit Logging
- **Title:** Security audit logging
- **Description:** All security-relevant actions are recorded in an immutable audit log.
- **Priority:** P0
- **Dependencies:** None
- **Acceptance Criteria:** See audited events in SECURITY.md
- **Expected Tests:** Login creates audit entry, admin action creates audit entry

### REQ-SECURITY-004: IDOR Prevention
- **Title:** Object-level authorization
- **Description:** Every data-access operation verifies the user has access to the specific resource.
- **Priority:** P0
- **Dependencies:** None
- **Acceptance Criteria:** No endpoint allows access to resources the user doesn't own or isn't authorized to view.
- **Expected Tests:** User A cannot access User B's private resources, user cannot modify others' content
