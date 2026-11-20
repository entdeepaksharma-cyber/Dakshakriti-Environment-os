import { useEffect, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Languages,
  ListChecks,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  AcademicSubject,
  AcademicTopic,
  AcademicUnitSummary,
  AuthUser,
  QuizEvalResult,
  QuizQuestionPublic,
} from '../types';
import { VerificationLabel } from './StatusText';

interface AcademyViewProps {
  user: AuthUser | null;
  onOpenAuth: () => void;
}

export function AcademyView({ user, onOpenAuth }: AcademyViewProps) {
  const [subject, setSubject] = useState<AcademicSubject | null>(null);
  const [units, setUnits] = useState<AcademicUnitSummary[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('unit-01');
  const [topics, setTopics] = useState<AcademicTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<AcademicTopic | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  const [language, setLanguage] = useState<'en' | 'hi' | 'both'>('both');
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  // Quiz state
  const [quizAttemptId, setQuizAttemptId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionPublic[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizEvalResult | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  async function loadOverview() {
    const data = await apiRequest<{
      subject: AcademicSubject;
      units: AcademicUnitSummary[];
      bookmarks: string[];
      progress: { topic_id: string; progress_status: string }[];
    }>('/academy/overview');
    setSubject(data.subject);
    setUnits(data.units);
    setBookmarks(data.bookmarks);
    setCompletedTopicIds(
      data.progress
        .filter((p) => p.progress_status === 'completed')
        .map((p) => p.topic_id)
    );
  }

  async function loadUnitTopics(unitId: string) {
    const list = await apiRequest<AcademicTopic[]>(`/academy/units/${unitId}/topics`);
    setTopics(list);
    if (list.length > 0) {
      const detail = await apiRequest<AcademicTopic>(`/academy/topics/${list[0].id}`);
      setSelectedTopic(detail);
    } else {
      setSelectedTopic(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadUnitTopics(selectedUnitId)])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSelectUnit(unitId: string) {
    setSelectedUnitId(unitId);
    setMode('study');
    setQuizResult(null);
    setQuizAttemptId(null);
    await loadUnitTopics(unitId);
  }

  async function handleSelectTopic(topicId: string) {
    setMode('study');
    const detail = await apiRequest<AcademicTopic>(`/academy/topics/${topicId}`);
    setSelectedTopic(detail);
  }

  async function handleToggleComplete(topicId: string) {
    if (!user) {
      onOpenAuth();
      return;
    }
    const isCompleted = completedTopicIds.includes(topicId);
    const nextStatus = isCompleted ? 'not_started' : 'completed';
    try {
      await apiRequest(`/academy/progress/${topicId}`, {
        method: 'PUT',
        body: JSON.stringify({ progress_status: nextStatus }),
      });
      await loadOverview();
      setStatusMessage(
        nextStatus === 'completed' ? 'Topic marked completed.' : 'Topic marked incomplete.'
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not update progress.');
    }
  }

  async function handleToggleBookmark(topicId: string) {
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      const res = await apiRequest<{ bookmarked: boolean }>(`/academy/bookmarks/${topicId}`, {
        method: 'POST',
      });
      await loadOverview();
      setStatusMessage(res.bookmarked ? 'Topic bookmarked for revision.' : 'Bookmark removed.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not update bookmark.');
    }
  }

  async function handleStartQuiz(scopeUnitId: string | 'all') {
    setQuizLoading(true);
    setQuizResult(null);
    setQuizAnswers({});
    setMode('quiz');
    try {
      const res = await apiRequest<{
        attempt_id: string;
        questions: QuizQuestionPublic[];
      }>('/academy/quizzes/start', {
        method: 'POST',
        body: JSON.stringify({ unit_id: scopeUnitId }),
      });
      setQuizAttemptId(res.attempt_id);
      setQuizQuestions(res.questions);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to start quiz.');
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleSubmitQuiz() {
    if (!quizAttemptId) return;
    setQuizLoading(true);
    try {
      const res = await apiRequest<QuizEvalResult>(
        `/academy/quizzes/${quizAttemptId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ answers: quizAnswers }),
        }
      );
      setQuizResult(res);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to evaluate answers.');
    } finally {
      setQuizLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading Environmental Law Academy syllabus and bilingual study modules...
      </div>
    );
  }

  const activeUnit = units.find((u) => u.id === selectedUnitId);

  return (
    <div className="space-y-6">
      {/* Subject Header & Mode Controls */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {subject?.subject_code} · {subject?.degree_name} · {subject?.semester} ·{' '}
              {subject?.university_name}
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
              {subject?.subject_name ?? 'Environmental Law'} Academy
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {subject?.syllabus_version} ({subject?.applicable_batch}) · {subject?.source_reference}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Bilingual Switch */}
            <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-1">
              {(
                [
                  { id: 'both', label: 'EN + हिन्दी' },
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिन्दी' },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    language === lang.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleStartQuiz(selectedUnitId)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span>Unit MCQ Test</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartQuiz('all')}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Full 5-Unit Mock Exam</span>
            </button>
          </div>
        </div>

        {/* 5-Unit Selector Bar */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {units.map((u) => {
            const isSelected = u.id === selectedUnitId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectUnit(u.id)}
                className={`flex flex-col justify-between rounded-md border p-3.5 text-left transition-colors ${
                  isSelected
                    ? 'border-[#14532D] bg-[#14532D]/5'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 tabular-nums">
                    <span>UNIT 0{u.unit_number}</span>
                    <span>
                      {u.completed_topics}/{u.topic_count}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-900 line-clamp-2">
                    {u.unit_title}
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-[#14532D] transition-all"
                    style={{ width: `${u.completion_percentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {statusMessage && (
          <div className="mt-3 text-xs font-medium text-[#14532D]" role="status">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Main Content Area: Study Workspace OR MCQ Exam */}
      {mode === 'quiz' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                LL.B. Environmental Law MCQ Assessment
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Answers are evaluated strictly on the server. Correct keys are revealed only after submission.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMode('study')}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Return to Study Notes
            </button>
          </div>

          {quizLoading && (
            <div className="py-8 text-sm text-slate-500">Preparing assessment...</div>
          )}

          {!quizLoading && quizResult && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div>
                  <div className="text-xs text-slate-500">Server-Evaluated Result</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {quizResult.correct_count} / {quizResult.total_questions} ({quizResult.score_percentage}%)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartQuiz(selectedUnitId)}
                  className="rounded-md bg-[#14532D] px-4 py-2 text-xs font-medium text-white hover:bg-[#166534]"
                >
                  Retake Quiz
                </button>
              </div>

              <div className="space-y-4">
                {quizResult.results.map((r, idx) => (
                  <div
                    key={r.question_id}
                    className="rounded-md border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">
                        {idx + 1}. {r.question_text}
                      </div>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          r.is_correct ? 'text-[#15803D]' : 'text-[#DC2626]'
                        }`}
                      >
                        {r.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-700">
                      <span className="font-semibold">Correct Answer:</span>{' '}
                      {r.correct_option_text}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {r.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!quizLoading && !quizResult && (
            <div className="mt-6 space-y-6">
              {quizQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2.5 border-b border-slate-100 pb-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">
                      Q{idx + 1}. {q.question_text}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 capitalize shrink-0">
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const checked = quizAnswers[q.id] === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-xs transition-colors ${
                            checked
                              ? 'border-[#14532D] bg-[#14532D]/5 text-slate-900 font-medium'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={checked}
                            onChange={() =>
                              setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                            }
                            className="accent-[#14532D]"
                          />
                          <span>{opt.option_text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 tabular-nums">
                  Answered {Object.keys(quizAnswers).length} of {quizQuestions.length}
                </span>
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="rounded-md bg-[#14532D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#166534]"
                >
                  Submit Answers for Grading
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Topic Index Sidebar */}
          <aside className="lg:col-span-4 space-y-2 rounded-lg border border-slate-200 bg-white p-4 h-fit">
            <div className="border-b border-slate-200 pb-3">
              <div className="text-xs font-mono text-slate-500">
                UNIT 0{activeUnit?.unit_number} TOPICS
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {activeUnit?.unit_title}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              {topics.map((topic) => {
                const isSelected = selectedTopic?.id === topic.id;
                const isDone = completedTopicIds.includes(topic.id);
                const isSaved = bookmarks.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleSelectTopic(topic.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#14532D] text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] opacity-75 shrink-0 tabular-nums">
                        {String(topic.display_order).padStart(2, '0')}
                      </span>
                      <span className="truncate">{topic.topic_title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDone && (
                        <CheckCircle2
                          className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-[#15803D]'}`}
                        />
                      )}
                      {isSaved && (
                        <Bookmark
                          className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-amber-600'}`}
                        />
                      )}
                      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Topic Study Deck */}
          <article className="lg:col-span-8 space-y-6 rounded-lg border border-slate-200 bg-white p-6">
            {selectedTopic ? (
              <>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Unit 0{activeUnit?.unit_number}</span>
                      <span aria-hidden="true">·</span>
                      <VerificationLabel status={selectedTopic.verification_status} />
                    </div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {selectedTopic.topic_title}
                    </h2>
                    <p className="text-xs text-slate-600">{selectedTopic.topic_description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(selectedTopic.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                        bookmarks.includes(selectedTopic.id)
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>
                        {bookmarks.includes(selectedTopic.id) ? 'Bookmarked' : 'Bookmark'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleComplete(selectedTopic.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                        completedTopicIds.includes(selectedTopic.id)
                          ? 'bg-[#15803D] text-white'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {completedTopicIds.includes(selectedTopic.id)
                          ? 'Completed'
                          : 'Mark Complete'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* English Academic Notes */}
                {language !== 'hi' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Topic Introduction & Objectives
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {selectedTopic.introduction}
                      </p>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                        {selectedTopic.learning_objectives.map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Detailed Legal Analysis
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-800">
                        {selectedTopic.detailed_notes}
                      </p>
                    </div>

                    {selectedTopic.legal_definitions.length > 0 && (
                      <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Key Statutory Definitions
                        </h3>
                        <dl className="mt-2 space-y-2.5">
                          {selectedTopic.legal_definitions.map((def, idx) => (
                            <div
                              key={idx}
                              className="rounded-md border border-slate-200 bg-slate-50 p-3"
                            >
                              <dt className="text-xs font-semibold text-slate-900">{def.term}</dt>
                              <dd className="mt-1 text-xs leading-relaxed text-slate-600">
                                {def.definition}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {selectedTopic.examples.length > 0 && (
                      <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Practical & Rajasthan Context Examples
                        </h3>
                        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
                          {selectedTopic.examples.map((ex, idx) => (
                            <li key={idx}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Hindi Explanation */}
                {language !== 'en' && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#14532D]">
                      <Languages className="h-4 w-4" />
                      <span>हिन्दी व्याख्या — {selectedTopic.hindi_title}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800">
                      {selectedTopic.hindi_explanation}
                    </p>
                  </div>
                )}

                {/* Linked Statutory Provisions & Case Law */}
                <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Linked Statutory Provisions
                    </h3>
                    {selectedTopic.linked_provisions?.map((prov) => (
                      <div
                        key={prov.id}
                        className="rounded-md border border-slate-200 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {prov.legislation_title} · {prov.provision_number}
                          </span>
                          <VerificationLabel status={prov.verification_status} />
                        </div>
                        <div className="mt-1 font-medium text-slate-700">
                          {prov.provision_heading}
                        </div>
                        <p className="mt-1 leading-relaxed text-slate-600">
                          {prov.provision_text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Linked Supreme Court Judgments
                    </h3>
                    {selectedTopic.linked_judgments?.map((j) => (
                      <div
                        key={j.id}
                        className="rounded-md border border-slate-200 p-3 text-xs"
                      >
                        <div className="font-semibold text-slate-900">{j.case_title}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {j.citation}
                        </div>
                        <p className="mt-1.5 leading-relaxed text-slate-600">{j.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exam & Research Questions */}
                <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      LL.B. University Exam Questions
                    </h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-slate-700">
                      {selectedTopic.exam_questions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Independent Research Prompts
                    </h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-slate-700">
                      {selectedTopic.research_questions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Traceable Sources */}
                <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Traceable Legal Sources: </span>
                  {selectedTopic.sources.map((s) => `${s.title} (${s.authority})`).join(' · ')}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">Select a topic from the unit outline.</div>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
