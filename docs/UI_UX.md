# AttendFlow AI — UI/UX Specification

## 1. Design Direction

AttendFlow AI should look like a professional enterprise SaaS product.

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Responsive design
- Accessible components

Design should prioritize:

- Clarity
- Speed
- Trust
- Auditability
- Business workflow visibility

Avoid:

- Generic AI landing-page aesthetics
- Excessive gradients
- Excessive glassmorphism
- Unnecessary animations
- Giant chatbot interfaces
- Decorative UI that reduces usability

---

# 2. Application Layout

Desktop:

Sidebar
+
Top navigation
+
Main content

Mobile:

Responsive navigation
+
Full-width content

---

# 3. Employee Dashboard

Display:

### Attendance Summary

- Today's attendance
- Current status
- Scheduled hours
- Hours worked

### Recent Attendance

Table:

Date
Clock-in
Clock-out
Status

### Correction Requests

Show:

Request date
Requested change
Status
Submitted date

Primary button:

Request Attendance Correction

---

# 4. Attendance Correction

Main interface:

## Request Attendance Correction

Natural-language input:

"I forgot to clock out yesterday at 5:10 PM."

Button:

Analyze Request

The system then displays:

### Request Summary

Date

Requested clock-in

Requested clock-out

Employee reason

---

# 5. AI Analysis

Display:

AI Decision

One of:

- Automatic correction
- HR approval required
- Needs clarification
- Rejected

Display:

Reason

Business rules triggered

Current attendance

Requested attendance

Do not expose internal chain-of-thought.

Only display a concise decision explanation.

---

# 6. Request Status

Statuses:

Submitted
AI Reviewing
HR Review
Approved
Rejected
Completed

Use clear status indicators.

---

# 7. HR Dashboard

Dashboard sections:

### Pending Approval

Show:

Employee
Date
Requested correction
Reason
AI decision
Priority
Submitted time

---

### Attendance Exceptions

Show:

- Missing clock-out
- Missing clock-in
- Unusual overtime
- Repeated corrections

---

### AI Escalations

Show requests that require HR review.

---

# 8. HR Request Detail

Display:

Employee information

Attendance date

Current attendance

Requested attendance

Employee reason

AI decision

AI confidence if available

Decision explanation

Triggered business rules

Previous correction history

Actions:

Approve

Reject

Request Clarification

---

# 9. Audit Log

Columns:

Timestamp

Actor

Action

Entity

Previous Value

New Value

Result

Filters:

Actor

Action

Date

Entity

---

# 10. Notifications

Employees receive notifications for:

- Request submitted
- HR approval required
- Request approved
- Request rejected
- Request completed

HR receives notifications for:

- New approval request
- Escalated request
- AI processing failure

---

# 11. Accessibility

The application should support:

- Keyboard navigation
- Visible focus states
- Accessible labels
- Appropriate contrast
- Semantic HTML
- Screen-reader friendly controls

---

# 12. Responsive Behavior

Employee workflows must work properly on:

- Desktop
- Tablet
- Mobile

HR tables may transform into cards on small screens.

---

# 13. UX Principle

Every AI action must clearly communicate:

What the system understood.

What information was checked.

What decision was made.

Whether human approval is required.

Whether an action was actually completed.

Never make an AI recommendation look like a completed action.