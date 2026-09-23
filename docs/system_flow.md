# AttendFlow AI — System Flow

## 1. System Purpose

AttendFlow AI allows employees to submit attendance correction requests using natural language.

The AI agent analyzes the request, retrieves relevant attendance information, evaluates deterministic business rules, and routes the request to either:

- Automatic processing
- HR approval
- Rejection
- Clarification

The system must maintain a complete audit trail.

---

# 2. Main Flow

Employee
↓
Authentication
↓
Employee Dashboard
↓
Attendance Correction Request
↓
AI Agent
↓
Understand Request
↓
Retrieve Employee Context
↓
Retrieve Attendance
↓
Retrieve Work Schedule
↓
Retrieve Correction History
↓
Evaluate Business Rules
↓
Determine Decision
↓
Human Approval if Required
↓
Execute Approved Change
↓
Verify Result
↓
Notify Employee
↓
Audit Log

---

# 3. Example Request

Employee:

"I forgot to clock out yesterday at 5:10 PM."

The system extracts:

Date:
Yesterday

Requested clock-out:
5:10 PM

Reason:
Forgot to clock out

---

# 4. AI Processing

The agent retrieves:

- Employee identity
- Attendance record
- Work schedule
- Previous correction requests
- Attendance rules
- Payroll lock status if applicable

The AI must not make decisions using information it does not retrieve.

---

# 5. Automatic Correction

Automatic processing is allowed only when deterministic business rules permit it.

Example:

Employee:

"I forgot to clock out yesterday at 5:03 PM."

System:

Clock-in:
08:01 AM

Clock-out:
Missing

Scheduled end:
05:00 PM

Previous corrections:
0

If the configured rules permit the correction:

Decision:

AUTO_APPROVE

The system creates the correction.

---

# 6. HR Approval

Example:

Employee requests:

Clock-out:
10:00 PM

Scheduled end:
05:00 PM

The request creates significant overtime.

The AI should determine:

REQUIRES_HR_APPROVAL

The system creates an approval request.

HR sees:

Employee
Attendance date
Existing attendance
Requested attendance
Reason
AI analysis
Reason for escalation
Previous correction history

HR can:

- Approve
- Reject
- Request clarification

---

# 7. Existing Attendance

If an employee already has a clock-out:

08:00 AM → 05:00 PM

and requests:

08:00 AM → 02:00 PM

The system must not automatically overwrite the existing record.

The request should be escalated to HR.

---

# 8. Payroll Lock

If the attendance date belongs to a locked payroll period:

The AI cannot modify the attendance record.

The request must be sent to HR or an authorized payroll administrator.

---

# 9. Correction Limit

Example:

Maximum automatic corrections per employee per month:

2

If the employee already has 2 corrections:

The next request requires HR approval.

---

# 10. Missing Information

If the employee says:

"I forgot to clock out."

The system should ask:

"What date and approximate clock-out time should be recorded?"

The AI must not invent the missing values.

---

# 11. AI Decision Types

AUTO_APPROVE

Used only when all automatic business rules pass.

REQUIRES_HR_APPROVAL

Used when human review is required.

REJECT

Used when the request clearly violates a business rule.

NEEDS_CLARIFICATION

Used when required information is missing or ambiguous.

---

# 12. Human-in-the-Loop

Human approval is mandatory when:

- Request creates significant overtime
- Attendance period is locked
- Existing attendance must be overwritten
- Correction limit has been exceeded
- Business rules require approval
- AI cannot confidently interpret the request
- Sensitive information is involved

---

# 13. Tool Execution

The AI does not directly modify the database.

Example:

AI
↓
request_correction_approval()
↓
Server validates request
↓
Server checks business rules
↓
Database operation
↓
Audit log

---

# 14. Verification

After an approved operation:

1. Verify database update
2. Confirm expected attendance value
3. Create audit log
4. Update request status
5. Notify employee

The system must not report success if the database operation failed.

---

# 15. Audit Trail

Important events must be logged:

- Request submitted
- AI analysis
- AI decision
- Tool execution
- HR approval
- HR rejection
- Attendance modification
- Notification
- Errors

---

# 16. Error Handling

If AI processing fails:

Keep the request in a safe pending state.

Do not modify attendance.

Notify the appropriate HR user.

If a database operation fails:

Do not claim success.

Log the failure.

Allow the request to be retried safely.

---

# 17. Future Expansion

The architecture should allow future workforce agents such as:

- Leave management
- Overtime approval
- Employee document generation
- Payroll anomaly detection
- HR FAQ agent
- Employee onboarding automation

These should be added without redesigning the core authentication, database, approval, and audit architecture.