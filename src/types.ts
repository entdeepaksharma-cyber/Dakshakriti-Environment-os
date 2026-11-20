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

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role_code: RoleCode;
  organisation_id: string | null;
  account_status: string;
  permissions: string[];
  created_at: string;
}

export interface RoleDefinition {
  code: RoleCode;
  name: string;
  description: string;
  permissions: string[];
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
  academic_status: string;
  source_reference: string;
}

export interface AcademicUnitSummary {
  id: string;
  subject_id: string;
  unit_number: number;
  unit_title: string;
  unit_description: string;
  display_order: number;
  topic_count: number;
  completed_topics: number;
  completion_percentage: number;
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
  linked_provisions?: {
    id: string;
    provision_number: string;
    provision_heading: string;
    provision_text: string;
    legislation_title: string;
    version_label: string;
    verification_status: VerificationStatus;
  }[];
  linked_judgments?: Judgment[];
}

export interface QuizQuestionPublic {
  id: string;
  unit_id: string;
  topic_id: string;
  question_text: string;
  difficulty: string;
  options: {
    id: string;
    option_text: string;
    display_order: number;
  }[];
}

export interface QuizEvalResult {
  attempt_id: string;
  correct_count: number;
  total_questions: number;
  score_percentage: number;
  results: {
    question_id: string;
    question_text: string;
    selected_option_id: string;
    correct_option_id: string;
    correct_option_text: string;
    is_correct: boolean;
    explanation: string;
  }[];
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

export interface LegislationDoc {
  id: string;
  short_title: string;
  full_title: string;
  act_number: string;
  enactment_year: number;
  jurisdiction: string;
  summary: string;
  current_status: VerificationStatus;
  source?: {
    source_title: string;
    issuing_authority: string;
    official_url: string;
    verification_status: VerificationStatus;
  };
  versions: LegislationVersion[];
  provisions: StatutoryProvision[];
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
  principles: {
    id: string;
    principle_name: string;
    explanation: string;
    relevant_paragraphs: string;
  }[];
  linked_provisions?: {
    id: string;
    provision_number: string;
    provision_heading: string;
    legislation_title: string;
  }[];
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

export interface EnvironmentalReport {
  id: string;
  report_number: string;
  created_by: string;
  category: string;
  description: string;
  incident_date: string | null;
  location_text: string;
  district: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  alleged_responsible_party: string | null;
  status: string;
  confidentiality_level: string;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  is_owner?: boolean;
  events?: {
    id: string;
    actor_name: string;
    event_type: string;
    event_description: string;
    created_at: string;
  }[];
}

export interface EvidenceRecord {
  id: string;
  evidence_number: string;
  uploaded_by: string;
  report_id: string | null;
  evidence_type: string;
  description: string;
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

export interface ComplaintItem {
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
  status: string;
  current_version: number;
  approved_by_name: string | null;
  approved_at: string | null;
  submission_date: string | null;
  acknowledgement_reference: string | null;
  created_at: string;
  updated_at: string;
  authority?: Authority | null;
  report?: EnvironmentalReport | null;
  events?: {
    id: string;
    actor_name: string;
    event_type: string;
    description: string;
    external_reference: string | null;
    created_at: string;
  }[];
  versions?: {
    id: string;
    version_number: number;
    document_content: string;
    review_status: string;
    created_at: string;
  }[];
}

export interface ResearchSession {
  id: string;
  title: string;
  jurisdiction: string;
  created_at: string;
  updated_at: string;
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: {
      type: 'statute' | 'judgment';
      title: string;
      reference: string;
      verification_status: string;
    }[];
    law_distinction?: {
      enacted_law: string;
      amendments_and_history: string;
      judicial_interpretation: string;
    };
    requires_human_verification?: boolean;
    created_at: string;
  }[];
}

export interface ImpactMetrics {
  academic: {
    units_count: number;
    topics_count: number;
    questions_count: number;
    quiz_attempts_count: number;
    topics_completed_count: number;
  };
  legal_library: {
    statutes_count: number;
    versions_count: number;
    provisions_count: number;
    verified_statutes_count: number;
    judgments_count: number;
    authorities_count: number;
  };
  civic_workflow: {
    reports_count: number;
    evidence_count: number;
    integrity_checked_evidence_count: number;
    complaints_count: number;
    approved_complaints_count: number;
    research_sessions_count: number;
    audit_events_count: number;
  };
}

export interface AuditLog {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  outcome: 'success' | 'denied' | 'error';
  details: string;
  created_at: string;
}
