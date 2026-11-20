export type RoleCode =
  | 'student'
  | 'citizen'
  | 'researcher'
  | 'lawyer'
  | 'reviewer'
  | 'admin';

export type VerificationStatus =
  | 'draft'
  | 'under_review'
  | 'verified'
  | 'published'
  | 'superseded'
  | 'withdrawn'
  | 'unverified'
  | 'pending';

export type ReportStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'under_review'
  | 'referred'
  | 'closed'
  | 'withdrawn';

export type ComplaintStatus =
  | 'draft'
  | 'review_pending'
  | 'approved'
  | 'submitted'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'closed';

export interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role_code: RoleCode;
  organisation_id: string | null;
  account_status: 'active' | 'suspended' | 'closed';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleDefinition {
  code: RoleCode;
  name: string;
  description: string;
  permissions: string[];
}

export interface OrganisationRecord {
  id: string;
  name: string;
  organisation_type: string;
  registration_number: string | null;
  created_at: string;
}

export interface AcademicSubject {
  id: string;
  subject_code: string;
  subject_name: string;
  degree_name: string;
  university_name: string;
  semester: string;
  syllabus_version: string;
  applicable_batch: string;
  academic_status: 'provisional' | 'verified';
  source_reference: string;
}

export interface AcademicUnit {
  id: string;
  subject_id: string;
  unit_number: number;
  unit_title: string;
  unit_description: string;
  display_order: number;
}

export interface AcademicTopic {
  id: string;
  unit_id: string;
  display_order: number;
  topic_title: string;
  topic_description: string;
  introduction: string;
  learning_objectives: string[];
  detailed_notes: string;
  legal_definitions: { term: string; definition: string }[];
  examples: string[];
  hindi_title: string;
  hindi_explanation: string;
  exam_questions: string[];
  research_questions: string[];
  sources: { title: string; authority: string; status: VerificationStatus }[];
  linked_provision_ids: string[];
  linked_judgment_ids: string[];
  verification_status: VerificationStatus;
}

export interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

export interface QuizQuestion {
  id: string;
  unit_id: string;
  topic_id: string;
  question_text: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: QuestionOption[];
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  unit_id: string | 'all';
  total_questions: number;
  score: number | null;
  started_at: string;
  completed_at: string | null;
  question_ids: string[];
  answers: {
    question_id: string;
    selected_option_id: string;
    is_correct: boolean;
  }[];
}

export interface StudentProgress {
  user_id: string;
  topic_id: string;
  progress_status: 'not_started' | 'in_progress' | 'completed';
  completed_at: string | null;
  updated_at: string;
}

export interface StudentBookmark {
  id: string;
  user_id: string;
  topic_id: string;
  created_at: string;
}

export interface LegalSource {
  id: string;
  source_title: string;
  source_type: string;
  issuing_authority: string;
  official_url: string;
  jurisdiction: string;
  verification_status: VerificationStatus;
  last_verified_at: string | null;
}

export interface Legislation {
  id: string;
  short_title: string;
  full_title: string;
  act_number: string;
  enactment_year: number;
  jurisdiction: string;
  source_id: string;
  summary: string;
  current_status: VerificationStatus;
}

export interface LegislationVersion {
  id: string;
  legislation_id: string;
  version_label: string;
  valid_from: string;
  valid_until: string | null;
  amendment_notes: string;
  official_reference: string;
  verification_status: VerificationStatus;
  verified_by_name: string | null;
  verified_at: string | null;
}

export interface StatutoryProvision {
  id: string;
  legislation_id: string;
  legislation_version_id: string;
  provision_number: string;
  provision_heading: string;
  provision_text: string;
  practical_relevance: string;
  display_order: number;
}

export interface CasePrinciple {
  id: string;
  principle_name: string;
  explanation: string;
  relevant_paragraphs: string;
}

export interface Judgment {
  id: string;
  case_title: string;
  citation: string;
  court_name: string;
  case_number: string;
  judgment_date: string;
  summary: string;
  bench: string;
  full_excerpt: string;
  verification_status: VerificationStatus;
  linked_provision_ids: string[];
  principles: CasePrinciple[];
}

export interface Authority {
  id: string;
  authority_name: string;
  authority_type: string;
  jurisdiction: string;
  district: string;
  state: string;
  official_website: string;
  official_contact: string;
  address: string;
  mandate: string;
  verification_status: VerificationStatus;
  last_verified_at: string;
}

export interface ReportEvent {
  id: string;
  report_id: string;
  actor_id: string;
  actor_name: string;
  event_type: string;
  event_description: string;
  created_at: string;
}

export interface EnvironmentalReport {
  id: string;
  report_number: string;
  created_by: string;
  organisation_id: string | null;
  category: string;
  description: string;
  incident_date: string | null;
  location_text: string;
  district: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  alleged_responsible_party: string | null;
  status: ReportStatus;
  confidentiality_level: 'private' | 'organisation';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EvidenceRecord {
  id: string;
  evidence_number: string;
  uploaded_by: string;
  report_id: string | null;
  evidence_type: string;
  description: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  collected_at: string | null;
  uploaded_at: string;
  source_description: string;
  verification_status: 'unverified' | 'integrity_checked';
  confidentiality_level: 'private';
  last_hash_check_at: string | null;
}

export interface ComplaintEvent {
  id: string;
  complaint_id: string;
  actor_id: string;
  actor_name: string;
  event_type: string;
  description: string;
  external_reference: string | null;
  created_at: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  report_id: string;
  created_by: string;
  authority_id: string;
  document_type: string;
  title: string;
  draft_text: string;
  legal_basis: string;
  linked_evidence_ids: string[];
  status: ComplaintStatus;
  current_version: number;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  submission_date: string | null;
  acknowledgement_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  complaint_id: string;
  version_number: number;
  document_content: string;
  reviewed_by: string | null;
  review_status: 'pending' | 'approved' | 'changes_requested';
  created_at: string;
}

export interface ResearchMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: {
    type: 'statute' | 'judgment';
    title: string;
    reference: string;
    verification_status: VerificationStatus;
  }[];
  law_distinction?: {
    enacted_law: string;
    amendments_and_history: string;
    judicial_interpretation: string;
  };
  requires_human_verification?: boolean;
  created_at: string;
}

export interface ResearchSession {
  id: string;
  user_id: string;
  title: string;
  jurisdiction: string;
  messages: ResearchMessage[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  outcome: 'success' | 'denied' | 'error';
  details: string;
  created_at: string;
}

export interface DakshakritiDatabase {
  users: UserRecord[];
  roles: RoleDefinition[];
  organisations: OrganisationRecord[];
  subjects: AcademicSubject[];
  units: AcademicUnit[];
  topics: AcademicTopic[];
  questions: QuizQuestion[];
  quiz_attempts: QuizAttempt[];
  student_progress: StudentProgress[];
  student_bookmarks: StudentBookmark[];
  legal_sources: LegalSource[];
  legislation: Legislation[];
  legislation_versions: LegislationVersion[];
  statutory_provisions: StatutoryProvision[];
  judgments: Judgment[];
  authorities: Authority[];
  environmental_reports: EnvironmentalReport[];
  report_events: ReportEvent[];
  evidence_records: EvidenceRecord[];
  complaints: Complaint[];
  complaint_events: ComplaintEvent[];
  document_versions: DocumentVersion[];
  research_sessions: ResearchSession[];
  audit_logs: AuditLog[];
}
