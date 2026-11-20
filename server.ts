import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { store, PRIVATE_STORAGE_DIR } from './server/store.js';
import { runLegalResearchQuery } from './server/gemini.js';
import {
  Complaint,
  DocumentVersion,
  EnvironmentalReport,
  EvidenceRecord,
  ResearchSession,
  RoleCode,
  UserRecord,
  VerificationStatus,
} from './server/types.js';

const PORT = 3000;
const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SECRET_KEY ||
  'dakshakriti-dev-ephemeral-signing-key-change-in-production';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

interface AuthenticatedRequest extends Request {
  currentUser?: UserRecord;
}

function signToken(user: UserRecord): string {
  return jwt.sign({ sub: user.id, role: user.role_code }, JWT_SECRET, {
    expiresIn: '12h',
  });
}

function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role_code: user.role_code,
    organisation_id: user.organisation_id,
    account_status: user.account_status,
    permissions: store.getPermissionsForRole(user.role_code),
    created_at: user.created_at,
  };
}

function extractUserFromHeader(req: Request): UserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = store.data.users.find((u) => u.id === payload.sub);
    if (!user || !user.is_active) return null;
    return user;
  } catch {
    return null;
  }
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = extractUserFromHeader(req);
  if (!user) {
    return res.status(401).json({ detail: 'Authentication required. Please sign in.' });
  }
  req.currentUser = user;
  next();
}

function requirePermission(permissionCode: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.currentUser;
    if (!user) {
      return res.status(401).json({ detail: 'Authentication required.' });
    }
    if (!store.hasPermission(user, permissionCode)) {
      store.recordAudit({
        actor: user,
        action: `permission.denied.${permissionCode}`,
        resource_type: 'rbac',
        outcome: 'denied',
        details: `Role '${user.role_code}' attempted '${permissionCode}' without authorization.`,
      });
      return res.status(403).json({
        detail: `Permission denied: role '${user.role_code}' lacks '${permissionCode}'.`,
      });
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const api = express.Router();

  // Health
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', application: 'Dakshakriti Environmental Law OS' });
  });
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', application: 'Dakshakriti Environmental Law OS' });
  });

  // =========================================================================
  // 1. AUTHENTICATION & RBAC
  // =========================================================================
  api.post('/auth/register', (req, res) => {
    const { email, full_name, password, requested_role } = req.body ?? {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ detail: 'Valid email address is required.' });
    }
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return res.status(400).json({ detail: 'Full name must be at least 2 characters.' });
    }
    if (!password || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ detail: 'Password must be at least 12 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = store.data.users.find((u) => u.email === normalizedEmail);
    if (existing) {
      return res.status(409).json({ detail: 'Email address is already registered.' });
    }

    // Security rule: self-registration can only pick student, citizen, or researcher
    const allowedSelfRoles: RoleCode[] = ['student', 'citizen', 'researcher'];
    const roleCode: RoleCode = allowedSelfRoles.includes(requested_role)
      ? requested_role
      : 'citizen';

    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: `user-${crypto.randomUUID()}`,
      email: normalizedEmail,
      full_name: full_name.trim(),
      password_hash: bcrypt.hashSync(password, 10),
      role_code: roleCode,
      organisation_id: store.data.organisations[0]?.id ?? null,
      account_status: 'active',
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    store.data.users.push(newUser);
    store.recordAudit({
      actor: newUser,
      action: 'auth.register',
      resource_type: 'user',
      resource_id: newUser.id,
      outcome: 'success',
      details: `Registered account as '${roleCode}'.`,
    });

    const token = signToken(newUser);
    return res.status(201).json({
      message: 'Registration successful',
      access_token: token,
      token_type: 'bearer',
      user: sanitizeUser(newUser),
    });
  });

  api.post('/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = store.data.users.find((u) => u.email === normalizedEmail);

    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      store.recordAudit({
        actor: user ?? null,
        action: 'auth.login_failed',
        resource_type: 'user',
        resource_id: user?.id ?? null,
        outcome: 'denied',
        details: `Failed login attempt for ${normalizedEmail}.`,
      });
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ detail: 'Account is inactive.' });
    }

    store.recordAudit({
      actor: user,
      action: 'auth.login',
      resource_type: 'user',
      resource_id: user.id,
      outcome: 'success',
      details: `Authenticated as ${user.role_code}.`,
    });

    return res.json({
      access_token: signToken(user),
      token_type: 'bearer',
      user: sanitizeUser(user),
    });
  });

  api.post('/auth/demo-login', (req, res) => {
    const { role_code } = req.body ?? {};
    const user = store.data.users.find((u) => u.role_code === role_code && u.is_active);
    if (!user) {
      return res.status(404).json({ detail: 'Demo profile not found for this role.' });
    }
    store.recordAudit({
      actor: user,
      action: 'auth.demo_switch',
      resource_type: 'user',
      resource_id: user.id,
      outcome: 'success',
      details: `Signed into illustrative workspace profile (${user.role_code}).`,
    });
    return res.json({
      access_token: signToken(user),
      token_type: 'bearer',
      user: sanitizeUser(user),
    });
  });

  api.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    return res.json(sanitizeUser(req.currentUser!));
  });

  api.get('/roles', (_req, res) => {
    return res.json(store.data.roles);
  });

  // =========================================================================
  // 2. ENVIRONMENTAL LAW ACADEMY (5-Unit LL.B. Workspace + Quiz Engine)
  // =========================================================================
  api.get('/academy/overview', (req, res) => {
    const user = extractUserFromHeader(req);
    const subject = store.data.subjects[0];
    const units = store.data.units.map((u) => {
      const unitTopics = store.data.topics.filter((t) => t.unit_id === u.id);
      const completedCount = user
        ? unitTopics.filter((t) =>
            store.data.student_progress.some(
              (p) =>
                p.user_id === user.id &&
                p.topic_id === t.id &&
                p.progress_status === 'completed'
            )
          ).length
        : 0;
      const pct =
        unitTopics.length === 0
          ? 0
          : Math.round((completedCount / unitTopics.length) * 100);

      return {
        ...u,
        topic_count: unitTopics.length,
        completed_topics: completedCount,
        completion_percentage: pct,
      };
    });

    const userBookmarks = user
      ? store.data.student_bookmarks
          .filter((b) => b.user_id === user.id)
          .map((b) => b.topic_id)
      : [];

    const userProgress = user
      ? store.data.student_progress.filter((p) => p.user_id === user.id)
      : [];

    return res.json({
      subject,
      units,
      bookmarks: userBookmarks,
      progress: userProgress,
    });
  });

  api.get('/academy/units/:unitId/topics', (req, res) => {
    const topics = store.data.topics
      .filter((t) => t.unit_id === req.params.unitId)
      .sort((a, b) => a.display_order - b.display_order);
    return res.json(topics);
  });

  api.get('/academy/topics/:topicId', (req, res) => {
    const topic = store.data.topics.find((t) => t.id === req.params.topicId);
    if (!topic) {
      return res.status(404).json({ detail: 'Topic not found.' });
    }
    const linkedProvisions = store.data.statutory_provisions
      .filter((p) => topic.linked_provision_ids.includes(p.id))
      .map((p) => {
        const leg = store.data.legislation.find((l) => l.id === p.legislation_id);
        const ver = store.data.legislation_versions.find(
          (v) => v.id === p.legislation_version_id
        );
        return {
          ...p,
          legislation_title: leg?.short_title ?? '',
          version_label: ver?.version_label ?? '',
          verification_status: ver?.verification_status ?? 'unverified',
        };
      });

    const linkedJudgments = store.data.judgments.filter((j) =>
      topic.linked_judgment_ids.includes(j.id)
    );

    return res.json({
      ...topic,
      linked_provisions: linkedProvisions,
      linked_judgments: linkedJudgments,
    });
  });

  api.put('/academy/progress/:topicId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { progress_status } = req.body ?? {};
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(progress_status)) {
      return res.status(400).json({ detail: 'Invalid progress status.' });
    }
    const topic = store.data.topics.find((t) => t.id === req.params.topicId);
    if (!topic) {
      return res.status(404).json({ detail: 'Topic not found.' });
    }

    const userId = req.currentUser!.id;
    const now = new Date().toISOString();
    const existing = store.data.student_progress.find(
      (p) => p.user_id === userId && p.topic_id === topic.id
    );
    if (existing) {
      existing.progress_status = progress_status;
      existing.completed_at = progress_status === 'completed' ? now : null;
      existing.updated_at = now;
    } else {
      store.data.student_progress.push({
        user_id: userId,
        topic_id: topic.id,
        progress_status,
        completed_at: progress_status === 'completed' ? now : null,
        updated_at: now,
      });
    }
    store.persist();
    return res.json({ topic_id: topic.id, progress_status });
  });

  api.post('/academy/bookmarks/:topicId', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.currentUser!.id;
    const topicId = String(req.params.topicId);
    const idx = store.data.student_bookmarks.findIndex(
      (b) => b.user_id === userId && b.topic_id === topicId
    );
    if (idx >= 0) {
      store.data.student_bookmarks.splice(idx, 1);
      store.persist();
      return res.json({ topic_id: topicId, bookmarked: false });
    }
    store.data.student_bookmarks.push({
      id: `bm-${crypto.randomUUID()}`,
      user_id: userId,
      topic_id: topicId,
      created_at: new Date().toISOString(),
    });
    store.persist();
    return res.json({ topic_id: topicId, bookmarked: true });
  });

  // Quiz Engine — NEVER expose `is_correct` or `explanation` prior to submission!
  api.post('/academy/quizzes/start', (req, res) => {
    const user = extractUserFromHeader(req);
    const { unit_id = 'all' } = req.body ?? {};
    const pool =
      unit_id === 'all'
        ? store.data.questions
        : store.data.questions.filter((q) => q.unit_id === unit_id);

    if (pool.length === 0) {
      return res.status(404).json({ detail: 'No questions available for this selection.' });
    }

    const attemptId = `quiz-${crypto.randomUUID()}`;
    store.data.quiz_attempts.push({
      id: attemptId,
      user_id: user?.id ?? 'guest',
      unit_id,
      total_questions: pool.length,
      score: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      question_ids: pool.map((q) => q.id),
      answers: [],
    });
    store.persist();

    const sanitizedQuestions = pool.map((q) => ({
      id: q.id,
      unit_id: q.unit_id,
      topic_id: q.topic_id,
      question_text: q.question_text,
      difficulty: q.difficulty,
      options: q.options.map((o) => ({
        id: o.id,
        option_text: o.option_text,
        display_order: o.display_order,
      })),
    }));

    return res.status(201).json({
      attempt_id: attemptId,
      unit_id,
      total_questions: pool.length,
      questions: sanitizedQuestions,
    });
  });

  api.post('/academy/quizzes/:attemptId/submit', (req, res) => {
    const attempt = store.data.quiz_attempts.find((a) => a.id === req.params.attemptId);
    if (!attempt) {
      return res.status(404).json({ detail: 'Quiz attempt not found.' });
    }

    const submittedAnswers: Record<string, string> = req.body?.answers ?? {};
    let correctCount = 0;

    const evaluated = attempt.question_ids.map((qId) => {
      const q = store.data.questions.find((item) => item.id === qId)!;
      const selectedOptionId = submittedAnswers[qId] ?? '';
      const correctOption = q.options.find((o) => o.is_correct)!;
      const isCorrect = selectedOptionId === correctOption.id;
      if (isCorrect) correctCount += 1;

      return {
        question_id: q.id,
        question_text: q.question_text,
        selected_option_id: selectedOptionId,
        correct_option_id: correctOption.id,
        correct_option_text: correctOption.option_text,
        is_correct: isCorrect,
        explanation: q.explanation,
      };
    });

    const percentage =
      attempt.total_questions > 0
        ? Math.round((correctCount / attempt.total_questions) * 100)
        : 0;

    attempt.score = percentage;
    attempt.completed_at = new Date().toISOString();
    attempt.answers = evaluated.map((e) => ({
      question_id: e.question_id,
      selected_option_id: e.selected_option_id,
      is_correct: e.is_correct,
    }));
    store.persist();

    return res.json({
      attempt_id: attempt.id,
      correct_count: correctCount,
      total_questions: attempt.total_questions,
      score_percentage: percentage,
      results: evaluated,
    });
  });

  // =========================================================================
  // 3. INDIAN ENVIRONMENTAL LEGISLATION LIBRARY (with Version & Verification)
  // =========================================================================
  api.get('/legal-documents', (_req, res) => {
    const docs = store.data.legislation.map((leg) => {
      const source = store.data.legal_sources.find((s) => s.id === leg.source_id);
      const versions = store.data.legislation_versions.filter(
        (v) => v.legislation_id === leg.id
      );
      const provisions = store.data.statutory_provisions
        .filter((p) => p.legislation_id === leg.id)
        .sort((a, b) => a.display_order - b.display_order);

      return {
        ...leg,
        source,
        versions,
        provisions,
      };
    });
    return res.json(docs);
  });

  api.patch(
    '/legal-documents/:id/verify',
    requireAuth,
    requirePermission('legal.verify'),
    (req: AuthenticatedRequest, res) => {
      const { verification_status } = req.body ?? {};
      const valid: VerificationStatus[] = ['verified', 'under_review', 'unverified'];
      if (!valid.includes(verification_status)) {
        return res.status(400).json({ detail: 'Invalid verification status.' });
      }
      const leg = store.data.legislation.find((l) => l.id === req.params.id);
      if (!leg) {
        return res.status(404).json({ detail: 'Legislation record not found.' });
      }

      leg.current_status = verification_status;
      const now = new Date().toISOString();
      store.data.legislation_versions
        .filter((v) => v.legislation_id === leg.id && v.valid_until === null)
        .forEach((v) => {
          v.verification_status = verification_status;
          v.verified_by_name = req.currentUser!.full_name;
          v.verified_at = now;
        });

      store.recordAudit({
        actor: req.currentUser!,
        action: 'legal_source.verification_updated',
        resource_type: 'legislation',
        resource_id: leg.id,
        outcome: 'success',
        details: `Updated verification status of '${leg.short_title}' to '${verification_status}'.`,
      });

      return res.json(leg);
    }
  );

  // =========================================================================
  // 4. CASE-LAW RESEARCH CENTRE
  // =========================================================================
  api.get('/judgments', (_req, res) => {
    const enriched = store.data.judgments.map((j) => {
      const linkedProvisions = store.data.statutory_provisions
        .filter((p) => j.linked_provision_ids.includes(p.id))
        .map((p) => {
          const leg = store.data.legislation.find((l) => l.id === p.legislation_id);
          return {
            id: p.id,
            provision_number: p.provision_number,
            provision_heading: p.provision_heading,
            legislation_title: leg?.short_title ?? '',
          };
        });
      return {
        ...j,
        linked_provisions: linkedProvisions,
      };
    });
    return res.json(enriched);
  });

  // =========================================================================
  // 5. RAJASTHAN & CENTRAL ENVIRONMENTAL AUTHORITY DIRECTORY
  // =========================================================================
  api.get('/authorities', (_req, res) => {
    return res.json(store.data.authorities);
  });

  // =========================================================================
  // 6. ENVIRONMENTAL INCIDENT REPORTING (Private & RLS-Enforced)
  // =========================================================================
  api.post(
    '/reports',
    requireAuth,
    requirePermission('reports.create'),
    (req: AuthenticatedRequest, res) => {
      const {
        category,
        description,
        incident_date,
        location_text,
        district,
        state,
        latitude,
        longitude,
        alleged_responsible_party,
      } = req.body ?? {};

      if (!category || String(category).trim().length < 2) {
        return res.status(400).json({ detail: 'Issue category is required.' });
      }
      if (!description || String(description).trim().length < 10) {
        return res
          .status(400)
          .json({ detail: 'Incident description must be at least 10 characters.' });
      }
      if (!location_text || String(location_text).trim().length < 2) {
        return res.status(400).json({ detail: 'Incident location is required.' });
      }

      const now = new Date().toISOString();
      const reportNumber = `ENV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const newReport: EnvironmentalReport = {
        id: `rep-${crypto.randomUUID()}`,
        report_number: reportNumber,
        created_by: req.currentUser!.id,
        organisation_id: req.currentUser!.organisation_id,
        category: String(category).trim(),
        description: String(description).trim(),
        incident_date: incident_date ? String(incident_date) : null,
        location_text: String(location_text).trim(),
        district: district ? String(district).trim() : null,
        state: state ? String(state).trim() : 'Rajasthan',
        latitude: latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null,
        longitude: longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null,
        alleged_responsible_party: alleged_responsible_party
          ? String(alleged_responsible_party).trim()
          : null,
        status: 'draft',
        confidentiality_level: 'private',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      store.data.environmental_reports.unshift(newReport);
      store.data.report_events.unshift({
        id: `re-${crypto.randomUUID()}`,
        report_id: newReport.id,
        actor_id: req.currentUser!.id,
        actor_name: req.currentUser!.full_name,
        event_type: 'report_created',
        event_description:
          'Private incident draft saved. Labelled as unverified user observation.',
        created_at: now,
      });

      store.recordAudit({
        actor: req.currentUser!,
        action: 'report.created',
        resource_type: 'environmental_report',
        resource_id: newReport.id,
        outcome: 'success',
        details: `Created private report ${newReport.report_number} (${newReport.district ?? newReport.location_text}).`,
      });

      return res.status(201).json({
        message: 'Report saved successfully',
        report: newReport,
      });
    }
  );

  api.get('/reports', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const canReview = store.hasPermission(user, 'reports.review');
    const canReadOwn = store.hasPermission(user, 'reports.read.own');

    if (!canReadOwn && !canReview) {
      return res.status(403).json({
        detail: `Role '${user.role_code}' does not have permission to view incident reports.`,
      });
    }

    // Strict Row-Level Isolation:
    // - Owners see all their own non-deleted reports.
    // - Reviewers/Lawyers see only non-draft reports submitted for review, never another user's private draft.
    const visible = store.data.environmental_reports.filter((r) => {
      if (r.deleted_at) return false;
      if (r.created_by === user.id) return true;
      if (canReview && r.status !== 'draft') return true;
      return false;
    });

    const enriched = visible.map((r) => {
      const events = store.data.report_events.filter((e) => e.report_id === r.id);
      const evidenceCount = store.data.evidence_records.filter(
        (ev) => ev.report_id === r.id
      ).length;
      return {
        ...r,
        events,
        evidence_count: evidenceCount,
        is_owner: r.created_by === user.id,
      };
    });

    return res.json(enriched);
  });

  api.get('/reports/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const report = store.data.environmental_reports.find(
      (r) => r.id === req.params.id && !r.deleted_at
    );
    if (!report) {
      return res.status(404).json({ detail: 'Report not found.' });
    }
    const isOwner = report.created_by === user.id;
    const canReview = store.hasPermission(user, 'reports.review') && report.status !== 'draft';
    if (!isOwner && !canReview) {
      store.recordAudit({
        actor: user,
        action: 'report.unauthorized_access',
        resource_type: 'environmental_report',
        resource_id: report.id,
        outcome: 'denied',
        details: `Blocked cross-user access to private report ${report.report_number}.`,
      });
      return res.status(404).json({ detail: 'Report not found.' });
    }
    return res.json(report);
  });

  api.patch('/reports/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const { status } = req.body ?? {};
    const report = store.data.environmental_reports.find(
      (r) => r.id === req.params.id && !r.deleted_at
    );
    if (!report) {
      return res.status(404).json({ detail: 'Report not found.' });
    }

    const isOwner = report.created_by === user.id;
    const canReview = store.hasPermission(user, 'reports.review');

    if (['submitted_for_review', 'withdrawn'].includes(status)) {
      if (!isOwner) {
        return res.status(403).json({ detail: 'Only the report owner may submit or withdraw.' });
      }
    } else if (['under_review', 'referred', 'closed'].includes(status)) {
      if (!canReview) {
        return res
          .status(403)
          .json({ detail: 'Only authorised reviewers or lawyers can update review status.' });
      }
    } else {
      return res.status(400).json({ detail: 'Invalid report status transition.' });
    }

    const now = new Date().toISOString();
    report.status = status;
    report.updated_at = now;

    store.data.report_events.unshift({
      id: `re-${crypto.randomUUID()}`,
      report_id: report.id,
      actor_id: user.id,
      actor_name: user.full_name,
      event_type: `status_${status}`,
      event_description: `Status changed to '${status}'.`,
      created_at: now,
    });

    store.recordAudit({
      actor: user,
      action: 'report.status_updated',
      resource_type: 'environmental_report',
      resource_id: report.id,
      outcome: 'success',
      details: `Report ${report.report_number} status updated to '${status}'.`,
    });

    return res.json(report);
  });

  // =========================================================================
  // 7. PRIVATE EVIDENCE MANAGEMENT (Private Disk Storage + SHA-256 Hashing)
  // =========================================================================
  api.post(
    '/evidence/upload',
    requireAuth,
    requirePermission('evidence.upload'),
    upload.single('file'),
    (req: AuthenticatedRequest, res) => {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ detail: 'Please select a file to upload.' });
      }
      if (!ALLOWED_MIMES.has(file.mimetype)) {
        return res.status(400).json({
          detail: 'Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF, or plain text.',
        });
      }

      const { description, evidence_type, report_id, collected_at, source_description } =
        req.body ?? {};
      if (!description || String(description).trim().length < 3) {
        return res.status(400).json({ detail: 'Evidence description is required.' });
      }

      if (report_id) {
        const linkedReport = store.data.environmental_reports.find(
          (r) => r.id === report_id && r.created_by === req.currentUser!.id
        );
        if (!linkedReport) {
          return res.status(403).json({
            detail: 'Cannot attach evidence to a report you do not own.',
          });
        }
      }

      const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
      const storageKey = `${crypto.randomUUID()}.bin`;
      const targetPath = path.join(PRIVATE_STORAGE_DIR, storageKey);
      fs.writeFileSync(targetPath, file.buffer);

      const now = new Date().toISOString();
      const record: EvidenceRecord = {
        id: `ev-${crypto.randomUUID()}`,
        evidence_number: `EVD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        uploaded_by: req.currentUser!.id,
        report_id: report_id ? String(report_id) : null,
        evidence_type: evidence_type ? String(evidence_type) : 'photograph',
        description: String(description).trim(),
        storage_key: storageKey,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        sha256_hash: sha256,
        collected_at: collected_at ? String(collected_at) : null,
        uploaded_at: now,
        source_description: source_description
          ? String(source_description).trim()
          : 'User-supplied private file upload',
        verification_status: 'unverified',
        confidentiality_level: 'private',
        last_hash_check_at: null,
      };

      store.data.evidence_records.unshift(record);
      store.recordAudit({
        actor: req.currentUser!,
        action: 'evidence.uploaded',
        resource_type: 'evidence_record',
        resource_id: record.id,
        outcome: 'success',
        details: `Stored private file ${record.evidence_number} (${record.original_filename}, SHA-256: ${sha256.slice(0, 12)}...).`,
      });

      return res.status(201).json({
        message: 'File accepted and stored privately. Upload does not verify legal authenticity.',
        evidence: record,
      });
    }
  );

  api.get('/evidence', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const canReadOwn = store.hasPermission(user, 'evidence.read.own');
    if (!canReadOwn) {
      return res.status(403).json({
        detail: `Role '${user.role_code}' cannot access private evidence vault.`,
      });
    }

    // Strict owner isolation per PDF page 56 & 61:
    // Even administrators do not automatically gain unrestricted access to private evidence files.
    const ownRecords = store.data.evidence_records.filter(
      (ev) => ev.uploaded_by === user.id
    );
    return res.json(ownRecords);
  });

  api.get('/evidence/:id/download', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const record = store.data.evidence_records.find((ev) => ev.id === req.params.id);
    if (!record) {
      return res.status(404).json({ detail: 'Evidence record not found.' });
    }
    if (record.uploaded_by !== user.id) {
      store.recordAudit({
        actor: user,
        action: 'evidence.unauthorized_download',
        resource_type: 'evidence_record',
        resource_id: record.id,
        outcome: 'denied',
        details: `Blocked unauthorized download of private evidence ${record.evidence_number}.`,
      });
      return res.status(403).json({
        detail: 'Access denied: private evidence is restricted to the uploader.',
      });
    }

    const filePath = path.join(PRIVATE_STORAGE_DIR, record.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ detail: 'Stored evidence file missing from private vault.' });
    }

    store.recordAudit({
      actor: user,
      action: 'evidence.downloaded',
      resource_type: 'evidence_record',
      resource_id: record.id,
      outcome: 'success',
      details: `Private evidence ${record.evidence_number} downloaded by uploader.`,
    });

    res.setHeader('Content-Type', record.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(record.original_filename)}"`
    );
    return fs.createReadStream(filePath).pipe(res);
  });

  api.post('/evidence/:id/verify-hash', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const record = store.data.evidence_records.find((ev) => ev.id === req.params.id);
    if (!record || record.uploaded_by !== user.id) {
      return res.status(404).json({ detail: 'Evidence record not found.' });
    }

    const filePath = path.join(PRIVATE_STORAGE_DIR, record.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ detail: 'Stored file missing from private storage.' });
    }

    const buffer = fs.readFileSync(filePath);
    const computed = crypto.createHash('sha256').update(buffer).digest('hex');
    const match = computed === record.sha256_hash;

    record.last_hash_check_at = new Date().toISOString();
    record.verification_status = match ? 'integrity_checked' : 'unverified';
    store.recordAudit({
      actor: user,
      action: 'evidence.hash_verified',
      resource_type: 'evidence_record',
      resource_id: record.id,
      outcome: match ? 'success' : 'error',
      details: `SHA-256 integrity check for ${record.evidence_number}: ${match ? 'MATCH' : 'MISMATCH'}.`,
    });

    return res.json({
      evidence_id: record.id,
      match,
      stored_sha256: record.sha256_hash,
      computed_sha256: computed,
      checked_at: record.last_hash_check_at,
    });
  });

  // =========================================================================
  // 8. COMPLAINT PREPARATION & EXPLICIT APPROVAL WORKFLOW
  // =========================================================================
  api.get('/complaints', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const canApprove = store.hasPermission(user, 'complaints.approve');
    const canReview = store.hasPermission(user, 'complaints.review');
    const visible = store.data.complaints.filter((c) => {
      if (c.created_by === user.id) return true;
      if ((canApprove || canReview) && c.status !== 'draft') return true;
      return false;
    });

    const enriched = visible.map((c) => ({
      ...c,
      authority: store.data.authorities.find((a) => a.id === c.authority_id) ?? null,
      report: store.data.environmental_reports.find((r) => r.id === c.report_id) ?? null,
      events: store.data.complaint_events.filter((e) => e.complaint_id === c.id),
      versions: store.data.document_versions.filter((v) => v.complaint_id === c.id),
    }));

    return res.json(enriched);
  });

  api.post(
    '/complaints/generate',
    requireAuth,
    requirePermission('complaints.create'),
    (req: AuthenticatedRequest, res) => {
      const user = req.currentUser!;
      const { report_id, authority_id, document_type = 'environmental_complaint' } =
        req.body ?? {};

      const report = store.data.environmental_reports.find(
        (r) => r.id === report_id && r.created_by === user.id
      );
      if (!report) {
        return res
          .status(404)
          .json({ detail: 'Incident report not found or not owned by current user.' });
      }
      const authority = store.data.authorities.find((a) => a.id === authority_id);
      if (!authority) {
        return res.status(404).json({ detail: 'Target regulatory authority not found.' });
      }

      const linkedEvidence = store.data.evidence_records.filter(
        (ev) => ev.report_id === report.id && ev.uploaded_by === user.id
      );

      let legalBasis =
        'Constitution of India (Article 21 & Article 51A(g)); Environment (Protection) Act, 1986 (Sections 3, 5)';
      if (report.category === 'water_pollution') {
        legalBasis =
          'Water (Prevention and Control of Pollution) Act, 1974 (Sections 21, 23, 24, 33A); Constitution Article 21; Subhash Kumar v. State of Bihar (AIR 1991 SC 420)';
      } else if (report.category === 'air_pollution' || report.category === 'industrial_pollution') {
        legalBasis =
          'Air (Prevention and Control of Pollution) Act, 1981 (Sections 19, 21, 22, 31A); Environment (Protection) Act, 1986 (Section 5); Vellore Citizens Welfare Forum (1996)';
      } else if (report.category === 'mining' || report.category === 'deforestation') {
        legalBasis =
          'Forest (Conservation) Act, 1980 (Section 2); Environment (Protection) Act, 1986; EIA Notification 2006; T.N. Godavarman v. Union of India (1997)';
      }

      const docLabelMap: Record<string, string> = {
        environmental_complaint: 'Formal Environmental Inspection Representation',
        rti_application: 'RTI Request for Consent & Monitoring Records (RTI Act Sec. 6)',
        legal_notice: '60-Day Statutory Citizen Notice (EPA 1986 Sec. 19(b))',
        ngt_petition_outline: 'NGT Section 14 Original Application Draft Outline',
      };
      const docLabel = docLabelMap[document_type] ?? 'Environmental Representation Draft';

      const evidenceSection =
        linkedEvidence.length > 0
          ? linkedEvidence
              .map(
                (ev, i) =>
                  `   (${i + 1}) ${ev.evidence_number} — ${ev.evidence_type}: ${ev.description} [SHA-256 Digest: ${ev.sha256_hash.slice(0, 16)}... | Unverified Citizen Attachment]`
              )
              .join('\n')
          : '   (No private evidence files linked yet — attach supporting records prior to review.)';

      const draftText = `TO,\n${authority.authority_name}\n${authority.address}\n\nDOCUMENT TYPE: ${docLabel}\nDATE: ${new Date().toISOString().slice(0, 10)}\nREFERENCE REPORT: ${report.report_number}\n\nSUBJECT: ${docLabel} regarding observed ${report.category.replace(/_/g, ' ')} at ${report.location_text}${report.district ? `, ${report.district}` : ''}${report.state ? `, ${report.state}` : ''}.\n\n1. FACTUAL OBSERVATION (UNVERIFIED CITIZEN RECORD):\n   Date Observed: ${report.incident_date ?? 'Not specified'}\n   Location: ${report.location_text}\n   Observation Summary: ${report.description}\n   ${report.alleged_responsible_party ? `Alleged Responsible Party (Recorded strictly as an unverified allegation pending official inquiry): ${report.alleged_responsible_party}` : 'Responsible Party: Unknown / To be ascertained during official inspection.'}\n\n2. APPLICABLE STATUTORY & JUDICIAL BASIS:\n   ${legalBasis}\n\n3. SUPPORTING PRIVATE EVIDENCE REFERENCES:\n${evidenceSection}\n\n4. PRAYER FOR STATUTORY ACTION:\n   The Authority is respectfully requested to conduct an independent field inspection, verify compliance with Consent to Establish/Operate conditions, collect statutory samples where applicable, and intimate action taken.\n\n[STATUS: DRAFT — NOT SUBMITTED. MUST BE REVIEWED BY A LAWYER/REVIEWER AND EXPLICITLY AUTHORIZED BY THE USER BEFORE EXTERNAL DISPATCH.]`;

      const now = new Date().toISOString();
      const complaint: Complaint = {
        id: `cmp-${crypto.randomUUID()}`,
        complaint_number: `CMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        report_id: report.id,
        created_by: user.id,
        authority_id: authority.id,
        document_type,
        title: `${docLabel} — ${report.location_text}`,
        draft_text: draftText,
        legal_basis: legalBasis,
        linked_evidence_ids: linkedEvidence.map((e) => e.id),
        status: 'draft',
        current_version: 1,
        approved_by: null,
        approved_by_name: null,
        approved_at: null,
        submission_date: null,
        acknowledgement_reference: null,
        created_at: now,
        updated_at: now,
      };

      store.data.complaints.unshift(complaint);
      const docVer: DocumentVersion = {
        id: `dv-${crypto.randomUUID()}`,
        complaint_id: complaint.id,
        version_number: 1,
        document_content: draftText,
        reviewed_by: null,
        review_status: 'pending',
        created_at: now,
      };
      store.data.document_versions.unshift(docVer);

      store.data.complaint_events.unshift({
        id: `ce-${crypto.randomUUID()}`,
        complaint_id: complaint.id,
        actor_id: user.id,
        actor_name: user.full_name,
        event_type: 'draft_generated',
        description: `Generated draft ${complaint.complaint_number} addressed to ${authority.authority_name}.`,
        external_reference: null,
        created_at: now,
      });

      store.recordAudit({
        actor: user,
        action: 'complaint.draft_generated',
        resource_type: 'complaint',
        resource_id: complaint.id,
        outcome: 'success',
        details: `Generated complaint draft ${complaint.complaint_number} for report ${report.report_number}.`,
      });

      return res.status(201).json(complaint);
    }
  );

  api.patch('/complaints/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const complaint = store.data.complaints.find((c) => c.id === req.params.id);
    if (!complaint) {
      return res.status(404).json({ detail: 'Complaint draft not found.' });
    }
    if (complaint.created_by !== user.id && !store.hasPermission(user, 'complaints.review')) {
      return res.status(403).json({ detail: 'Unauthorized to edit this complaint draft.' });
    }

    const { draft_text, submit_for_review } = req.body ?? {};
    const now = new Date().toISOString();

    if (typeof draft_text === 'string' && draft_text.trim().length > 20) {
      complaint.draft_text = draft_text;
      complaint.current_version += 1;
      store.data.document_versions.unshift({
        id: `dv-${crypto.randomUUID()}`,
        complaint_id: complaint.id,
        version_number: complaint.current_version,
        document_content: draft_text,
        reviewed_by: null,
        review_status: 'pending',
        created_at: now,
      });
    }

    if (submit_for_review === true && complaint.status === 'draft') {
      complaint.status = 'review_pending';
      store.data.complaint_events.unshift({
        id: `ce-${crypto.randomUUID()}`,
        complaint_id: complaint.id,
        actor_id: user.id,
        actor_name: user.full_name,
        event_type: 'submitted_for_legal_review',
        description: 'Draft submitted to Lawyer / Reviewer queue for statutory verification.',
        external_reference: null,
        created_at: now,
      });
    }

    complaint.updated_at = now;
    store.persist();
    return res.json(complaint);
  });

  api.post(
    '/complaints/:id/approve',
    requireAuth,
    requirePermission('complaints.approve'),
    (req: AuthenticatedRequest, res) => {
      const user = req.currentUser!;
      const complaint = store.data.complaints.find((c) => c.id === req.params.id);
      if (!complaint) {
        return res.status(404).json({ detail: 'Complaint not found.' });
      }
      const now = new Date().toISOString();
      complaint.status = 'approved';
      complaint.approved_by = user.id;
      complaint.approved_by_name = user.full_name;
      complaint.approved_at = now;
      complaint.updated_at = now;

      store.data.document_versions
        .filter((v) => v.complaint_id === complaint.id && v.version_number === complaint.current_version)
        .forEach((v) => {
          v.review_status = 'approved';
          v.reviewed_by = user.id;
        });

      store.data.complaint_events.unshift({
        id: `ce-${crypto.randomUUID()}`,
        complaint_id: complaint.id,
        actor_id: user.id,
        actor_name: user.full_name,
        event_type: 'legal_review_approved',
        description: `Approved by ${user.full_name} (${user.role_code}). Ready for explicit user authorization prior to dispatch.`,
        external_reference: null,
        created_at: now,
      });

      store.recordAudit({
        actor: user,
        action: 'complaint.approved',
        resource_type: 'complaint',
        resource_id: complaint.id,
        outcome: 'success',
        details: `Legal approval recorded for ${complaint.complaint_number}.`,
      });

      return res.json(complaint);
    }
  );

  api.post(
    '/complaints/:id/authorize-submission',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const user = req.currentUser!;
      const complaint = store.data.complaints.find((c) => c.id === req.params.id);
      if (!complaint || complaint.created_by !== user.id) {
        return res.status(404).json({ detail: 'Complaint draft not found for current user.' });
      }
      if (complaint.status !== 'approved') {
        return res.status(400).json({
          detail:
            'Mandatory safeguard: A complaint cannot be authorized for submission until reviewed and approved by an authorized Lawyer or Reviewer.',
        });
      }
      const { explicit_user_confirmation, acknowledgement_reference, channel_notes } =
        req.body ?? {};
      if (explicit_user_confirmation !== true) {
        return res.status(400).json({
          detail: 'Explicit user confirmation checkbox is required.',
        });
      }

      const now = new Date().toISOString();
      complaint.status = 'submitted';
      complaint.submission_date = now;
      complaint.acknowledgement_reference =
        acknowledgement_reference?.trim() || `EXT-REF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      complaint.updated_at = now;

      store.data.complaint_events.unshift({
        id: `ce-${crypto.randomUUID()}`,
        complaint_id: complaint.id,
        actor_id: user.id,
        actor_name: user.full_name,
        event_type: 'external_dispatch_recorded',
        description:
          channel_notes?.trim() ||
          'User explicitly authorized external dispatch and logged submission reference.',
        external_reference: complaint.acknowledgement_reference,
        created_at: now,
      });

      store.recordAudit({
        actor: user,
        action: 'complaint.submission_authorized',
        resource_type: 'complaint',
        resource_id: complaint.id,
        outcome: 'success',
        details: `Explicit user authorization recorded for ${complaint.complaint_number} (Ref: ${complaint.acknowledgement_reference}).`,
      });

      return res.json(complaint);
    }
  );

  // =========================================================================
  // 9. AI LEGAL RESEARCH WORKSPACE (Server-side Gemini 4 Hydrogen)
  // =========================================================================
  api.get('/research/sessions', (req, res) => {
    const user = extractUserFromHeader(req);
    const ownerId = user?.id ?? 'guest';
    const sessions = store.data.research_sessions.filter((s) => s.user_id === ownerId);
    return res.json(sessions);
  });

  api.post('/research/ask', async (req, res) => {
    const user = extractUserFromHeader(req);
    const { question, jurisdiction = 'Rajasthan, India', session_id } = req.body ?? {};

    if (!question || String(question).trim().length < 5) {
      return res.status(400).json({ detail: 'Please enter a clear legal research question.' });
    }

    try {
      const result = await runLegalResearchQuery(String(question).trim(), String(jurisdiction));
      const now = new Date().toISOString();
      const ownerId = user?.id ?? 'guest';

      let session: ResearchSession | undefined = session_id
        ? store.data.research_sessions.find((s) => s.id === session_id && s.user_id === ownerId)
        : undefined;

      if (!session) {
        session = {
          id: `res-${crypto.randomUUID()}`,
          user_id: ownerId,
          title: String(question).trim().slice(0, 72),
          jurisdiction: String(jurisdiction),
          messages: [],
          created_at: now,
          updated_at: now,
        };
        store.data.research_sessions.unshift(session);
      }

      session.messages.push(
        {
          id: `msg-${crypto.randomUUID()}`,
          role: 'user',
          content: String(question).trim(),
          created_at: now,
        },
        {
          id: `msg-${crypto.randomUUID()}`,
          role: 'assistant',
          content: result.answer,
          citations: result.citations as ResearchSession['messages'][number]['citations'],
          law_distinction: {
            enacted_law: result.enacted_law,
            amendments_and_history: result.amendments_and_history,
            judicial_interpretation: result.judicial_interpretation,
          },
          requires_human_verification: true,
          created_at: new Date().toISOString(),
        }
      );
      session.updated_at = new Date().toISOString();

      store.recordAudit({
        actor: user,
        action: 'ai_research.query',
        resource_type: 'research_session',
        resource_id: session.id,
        outcome: 'success',
        details: `AI research query executed (${jurisdiction}): "${String(question).slice(0, 60)}"`,
      });

      return res.json({
        session,
        latest_result: result,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to execute AI legal research query.';
      store.recordAudit({
        actor: user,
        action: 'ai_research.error',
        resource_type: 'research_session',
        outcome: 'error',
        details: message,
      });
      return res.status(500).json({ detail: message });
    }
  });

  // =========================================================================
  // 10. IMPACT METRICS & APPEND-ONLY SECURITY AUDIT LOGS
  // =========================================================================
  api.get('/impact/metrics', (_req, res) => {
    const data = store.data;
    return res.json({
      academic: {
        units_count: data.units.length,
        topics_count: data.topics.length,
        questions_count: data.questions.length,
        quiz_attempts_count: data.quiz_attempts.length,
        topics_completed_count: data.student_progress.filter(
          (p) => p.progress_status === 'completed'
        ).length,
      },
      legal_library: {
        statutes_count: data.legislation.length,
        versions_count: data.legislation_versions.length,
        provisions_count: data.statutory_provisions.length,
        verified_statutes_count: data.legislation.filter(
          (l) => l.current_status === 'verified'
        ).length,
        judgments_count: data.judgments.length,
        authorities_count: data.authorities.length,
      },
      civic_workflow: {
        reports_count: data.environmental_reports.filter((r) => !r.deleted_at).length,
        evidence_count: data.evidence_records.length,
        integrity_checked_evidence_count: data.evidence_records.filter(
          (e) => e.verification_status === 'integrity_checked'
        ).length,
        complaints_count: data.complaints.length,
        approved_complaints_count: data.complaints.filter((c) =>
          ['approved', 'submitted', 'acknowledged', 'in_progress', 'resolved'].includes(c.status)
        ).length,
        research_sessions_count: data.research_sessions.length,
        audit_events_count: data.audit_logs.length,
      },
    });
  });

  api.get('/audit/logs', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.currentUser!;
    const canReadAll = store.hasPermission(user, 'security.audit.read');
    const logs = canReadAll
      ? store.data.audit_logs
      : store.data.audit_logs.filter((l) => l.actor_id === user.id);

    return res.json({
      scope: canReadAll ? 'platform_all' : 'personal_activity',
      logs: logs.slice(0, 100),
    });
  });

  app.use('/api/v1', api);

  // Multer & Express JSON error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ detail: `Upload error: ${err.message}` });
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ detail: msg });
  });

  // Vite dev middleware vs Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dakshakriti Environmental Law OS running on http://localhost:${PORT}`);
  });
}

startServer();
