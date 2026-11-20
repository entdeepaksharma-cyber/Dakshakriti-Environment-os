import { GoogleGenAI, Type } from '@google/genai';
import { store } from './store.js';

export interface GroundedResearchOutput {
  answer: string;
  enacted_law: string;
  amendments_and_history: string;
  judicial_interpretation: string;
  citations: {
    type: 'statute' | 'judgment';
    title: string;
    reference: string;
    verification_status: 'verified' | 'under_review' | 'unverified';
  }[];
  practical_next_steps: string[];
}

function retrieveGroundedContext(query: string, jurisdiction: string) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  const provisions = store.data.statutory_provisions.map((p) => {
    const leg = store.data.legislation.find((l) => l.id === p.legislation_id);
    const ver = store.data.legislation_versions.find((v) => v.id === p.legislation_version_id);
    const haystack = `${leg?.short_title ?? ''} ${p.provision_number} ${p.provision_heading} ${p.provision_text} ${p.practical_relevance}`.toLowerCase();
    const score = terms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
    return { p, leg, ver, score };
  });

  provisions.sort((a, b) => b.score - a.score);
  const topProvisions = provisions.slice(0, 6);

  const judgments = store.data.judgments.map((j) => {
    const principles = j.principles.map((pr) => `${pr.principle_name}: ${pr.explanation}`).join(' ');
    const haystack = `${j.case_title} ${j.citation} ${j.summary} ${j.full_excerpt} ${principles}`.toLowerCase();
    const score = terms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
    return { j, score };
  });

  judgments.sort((a, b) => b.score - a.score);
  const topJudgments = judgments.slice(0, 5);

  const authorities = store.data.authorities
    .filter((a) => jurisdiction === 'All India' || a.state === jurisdiction || a.state === 'Rajasthan' || a.jurisdiction === 'All India')
    .slice(0, 4);

  return { topProvisions, topJudgments, authorities };
}

export async function runLegalResearchQuery(
  question: string,
  jurisdiction: string = 'Rajasthan, India'
): Promise<GroundedResearchOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured in environment secrets. Please set GEMINI_API_KEY in Settings > Secrets to run live AI legal research.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const { topProvisions, topJudgments, authorities } = retrieveGroundedContext(question, jurisdiction);

  const statuteContext = topProvisions
    .map(
      ({ p, leg, ver }) =>
        `- [${leg?.short_title ?? 'Statute'} | ${p.provision_number} | Version: ${ver?.version_label ?? 'Current'} | Status: ${ver?.verification_status ?? 'unverified'}]: ${p.provision_heading}. ${p.provision_text} (Amendments: ${ver?.amendment_notes ?? 'None noted'})`
    )
    .join('\n');

  const caseContext = topJudgments
    .map(
      ({ j }) =>
        `- [${j.case_title} (${j.citation}) | ${j.court_name} | Date: ${j.judgment_date} | Status: ${j.verification_status}]: ${j.summary} Principles: ${j.principles.map((pr) => `${pr.principle_name} (${pr.relevant_paragraphs}): ${pr.explanation}`).join('; ')}`
    )
    .join('\n');

  const authorityContext = authorities
    .map((a) => `- ${a.authority_name} (${a.authority_type}, ${a.jurisdiction}): ${a.mandate}`)
    .join('\n');

  const systemInstruction = `You are the Dakshakriti Environmental Law OS Legal Research Assistant (India & Rajasthan Environmental Law).
You must strictly follow these legal integrity rules:
1. Ground your response in the retrieved Dakshakriti knowledge base below and established Indian environmental law.
2. Explicitly distinguish between:
   (a) Currently enacted statutory law,
   (b) Amendments & historical versions (e.g., 2023 Jan Vishwas Act / 2024 Water Amendment vs prior criminal provisions), and
   (c) Judicial interpretation by the Supreme Court of India / NGT.
3. Never fabricate case citations or section numbers. If something is uncertain or unverified, state that human legal verification is required.
4. Return structured JSON matching the schema.`;

  const prompt = `Jurisdiction Focus: ${jurisdiction}
User Legal Research Question: ${question}

Retrieved Statutory Provisions from Dakshakriti Library:
${statuteContext}

Retrieved Landmark Judgments from Dakshakriti Case-Law Centre:
${caseContext}

Relevant Regulatory Authorities:
${authorityContext}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: {
            type: Type.STRING,
            description: 'Comprehensive, clear legal research synthesis directly answering the question.',
          },
          enacted_law: {
            type: Type.STRING,
            description: 'Summary of currently enacted statutory provisions applicable to the query.',
          },
          amendments_and_history: {
            type: Type.STRING,
            description: 'Distinction of recent amendments (2022–2024) or historical statutory positions.',
          },
          judicial_interpretation: {
            type: Type.STRING,
            description: 'Supreme Court and NGT constitutional or statutory principles governing the issue.',
          },
          citations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: 'statute or judgment' },
                title: { type: Type.STRING },
                reference: { type: Type.STRING },
                verification_status: {
                  type: Type.STRING,
                  description: 'verified, under_review, or unverified',
                },
              },
              required: ['type', 'title', 'reference', 'verification_status'],
            },
          },
          practical_next_steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'answer',
          'enacted_law',
          'amendments_and_history',
          'judicial_interpretation',
          'citations',
          'practical_next_steps',
        ],
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Gemini returned an empty response for this research query.');
  }

  return JSON.parse(text) as GroundedResearchOutput;
}
