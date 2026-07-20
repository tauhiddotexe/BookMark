# SECURITY.md

## Purpose

This document defines the minimum security requirements for every change made to Applyd.

Agent must review this file before modifying any code.

---

# Core Principles

Never prioritize convenience over security.

Every endpoint must assume user input is malicious.

Never trust frontend validation.

Authentication != Authorization.

Every database access must verify ownership.

---

# Authentication

- Every protected endpoint requires authentication.
- Never expose APIs without auth unless explicitly public.
- JWT secrets must come from environment variables.
- Never hardcode JWT secrets.
- JWT expiration must be enforced.
- Reject expired tokens.

---

# Authorization

Every request that accesses data must verify ownership.

Example:

Current user:
user_id = abc

Requested resource:
application.owner_id

Must satisfy

application.owner_id == user_id

Never trust IDs sent by frontend.

Prevent IDOR attacks.

---

# Environment Variables

Never commit:

.env
.env.local
.env.production

Never expose:

Mongo URI

Redis URL

Stripe Secret Key

JWT Secret

OpenAI API Key

SMTP credentials

AWS credentials

Any private token

Frontend may only use public VITE_* variables.

---

# Secrets

Never hardcode:

API keys

Passwords

Tokens

Database credentials

Secrets

Private URLs

Everything must come from environment variables.

---

# Input Validation

Validate every request using Pydantic models.

Reject:

missing fields

unexpected fields

invalid types

oversized payloads

Never directly trust JSON.

---

# MongoDB Security

Never build queries using user input directly.

Bad:

db.jobs.find({"title": request.title})

Good:

Use validated values.

Prevent NoSQL injection.

---

# SQL Injection

Always use ORM.

Never concatenate queries.

Never execute raw user input.

---

# File Upload Security

Only allow:

PDF

DOCX

Maximum file size:

10 MB

Verify MIME type.

Verify extension.

Generate random filenames.

Never trust uploaded filename.

Store uploads outside executable directories.

Reject archives.

Reject executables.

---

# Path Traversal

Never use user supplied paths.

Always sanitize filenames.

Never allow:

../

absolute paths

symbolic links

---

# Prompt Injection

Treat resume content and job descriptions as untrusted.

Never allow prompts to:

read secrets

access filesystem

execute code

ignore instructions

modify system prompt

Use strong system prompts.

Separate system prompt from user content.

---

# AI Endpoints

Require authentication.

Require ownership verification.

Rate limit requests.

Never expose internal prompts.

Never expose model configuration.

---

# Stripe

Always verify webhook signatures.

Never trust frontend payment status.

Always verify subscription server-side.

Premium access must be determined only from database after Stripe verification.

---

# Authentication Cookies

If cookies are used:

HttpOnly

Secure

SameSite=Lax or Strict

Never store sensitive tokens in localStorage unless unavoidable.

---

# Rate Limiting

Required on:

login

signup

resume analysis

resume tailoring

AI chat

search

password reset

Use IP + User ID limits.

---

# Error Handling

Production must never expose:

stack traces

database errors

file paths

internal exceptions

Return generic messages.

Log detailed errors privately.

---

# Logging

Never log:

JWT

passwords

emails

resume text

API keys

credit card information

authentication tokens

---

# CORS

Allow only known frontend origins.

Never use:

Access-Control-Allow-Origin: *

with credentials.

---

# Security Headers

Enable:

Content-Security-Policy

X-Frame-Options

X-Content-Type-Options

Referrer-Policy

Permissions-Policy

Strict-Transport-Security

---

# HTTPS

Always redirect HTTP to HTTPS.

Never send credentials over HTTP.

---

# Dependency Security

Run dependency audits regularly.

Update vulnerable packages.

Remove unused packages.

Pin package versions where appropriate.

---

# Admin Routes

Every admin endpoint must verify:

authenticated

admin role

Never rely on frontend hiding admin UI.

---

# Database Permissions

Application user should have minimum required permissions.

No admin/root database accounts.

Separate production and development databases.

---

# Multi-Tenant Isolation

Every query must include owner filtering.

Example:

WHERE owner_id = current_user

Never return data belonging to another user.

---

# Monitoring

Log:

failed logins

permission failures

payment failures

unexpected exceptions

AI abuse attempts

---

# Backup

Database backups must exist.

Restore procedure must be documented.

Test restores periodically.

---

# Production Build

Disable:

debug mode

Swagger (unless protected)

developer routes

test endpoints

sample credentials

---

# Source Maps

Disable production source maps unless absolutely required.

---

# Git Security

Never commit:

.env

credentials

private keys

tokens

Use .gitignore.

Rotate leaked secrets immediately.

---

# Code Review Checklist

Before every merge verify:

[ ] Authentication present

[ ] Authorization verified

[ ] Input validation added

[ ] Ownership checks implemented

[ ] No secrets committed

[ ] No verbose errors

[ ] Rate limiting applied

[ ] Secure file uploads

[ ] Stripe verification implemented

[ ] AI prompt injection considered

[ ] Logging reviewed

[ ] Dependencies audited

[ ] Security headers enabled

[ ] Tests updated

If any item fails, the PR is not production-ready.