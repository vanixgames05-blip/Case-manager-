import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { Case, CaseNature } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const predictNextStage = async (caseData: Case): Promise<string> => {
  if (!API_KEY) return "API Key not configured.";
  try {
    const historyLog = caseData.history.length > 0 
      ? `Case History (most recent first):
${caseData.history.slice(0, 3).map(h => `- On ${new Date(h.date).toLocaleDateString()}: The stage was "${h.stage}" and proceedings were "${h.proceedings}". Next date was set for ${new Date(h.nextDate).toLocaleDateString()}.`).join('\n')}`
      : "No case history available.";

    const prompt = `
Your role is to analyze Pakistani civil or criminal case-progress data and predict the most probable next stage strictly according to the Code of Civil Procedure (CPC), Criminal Procedure Code (CrPC), and common court practice in Pakistan.

You must:
1.  Analyze the provided case details, especially today's diary notes.
2.  Determine the procedural flow based on whether the case is Civil or Criminal.
3.  Suggest the most likely next stage that logically follows in Pakistani courts. Your answer must be concise.

**Instructions:**
-   You must follow Pakistani procedural flow only.
-   You cannot skip or jump stages.
-   Provide only the name of the next stage. Do not provide reasons or extra text.

---
**Case Data:**
-   **Case Type:** ${caseData.nature}
-   **Stage set for today's hearing:** ${caseData.currentStage}
-   **Today's Proceedings / Diary Notes:** "${caseData.diaryNotes}"
-   ${historyLog}

---
**Examples:**

**Civil Case Example:**
-   If diary notes say: "Written statement filed by defendant."
-   Your output should be: "Framing of Issues"

**Criminal Case Example:**
-   If diary notes say: "Prosecution evidence closed."
-   Your output should be: "Statement of Accused under Section 342 CrPC"
---

Based on the provided case data, what is the single, most likely procedural stage for the next hearing?
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error predicting next stage:", error);
    return "Could not predict next stage.";
  }
};

export const generateDraft = async (request: string): Promise<string> => {
  if (!API_KEY) return "API Key not configured.";
  try {
    const prompt = `
      You are a master legal drafter for the Pakistani legal system.
      Generate a complete, professional legal draft based on the following request.
      The draft must be well-formatted, legally sound, and ready for use in a Pakistani court.
      Use placeholders like "[NAME]", "[ADDRESS]", "[COURT NAME]" where specific details are missing.
      ---
      Request: "${request}"
      ---
      Generate the complete draft now.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating draft:", error);
    return "Could not generate draft. Please try again.";
  }
};


export interface DocumentAnalysis {
  summaryOfIssues: string;
  missingLegalElements: string;
  proceduralDefects: string;
  suggestedImprovements: string;
  revisedFullDraft: string;
  questionsForClarification: string;
  error?: string;
}


export async function* reviewDocumentStream(documentText: string): AsyncGenerator<string, void, unknown> {
  if (!API_KEY) {
    yield JSON.stringify({ error: "API Key not configured." });
    return;
  }

  try {
    const prompt = `
      System Prompt:
      "You are a senior advocate of the Supreme Court of Pakistan with decades of experience in civil and criminal litigation. Your task is to meticulously review a legal document uploaded by a junior lawyer.
      Your analysis must be sharp, practical, and strictly adhere to Pakistani law (CPC, CrPC, Qanun-e-Shahadat Order), court practices, and drafting conventions.

      You must:
      1.  Analyze the provided legal draft.
      2.  Identify drafting defects, missing essential elements, procedural gaps, factual ambiguities, and formatting weaknesses.
      3.  Suggest concrete, actionable improvements to strengthen the document.
      4.  If critical facts are missing that prevent a proper draft, you must ask for clarification. Do NOT invent facts.
      5.  Prepare a professionally corrected version of the document.

      The final output MUST be a clean JSON object without any markdown formatting. It must have the following structure:
      {
        "summaryOfIssues": "A bullet-point summary of the key problems found in the draft, formatted as a single string with '\\n' for new lines.",
        "missingLegalElements": "A bullet-point list of essential legal components (e.g., specific prayers, verifications, necessary sections of law) that are absent, formatted as a single string.",
        "proceduralDefects": "A bullet-point list of any violations or oversights related to CPC, CrPC, QSO, or standard court procedure, formatted as a single string.",
        "suggestedImprovements": "A bullet-point list of suggestions to improve the draft's clarity, strength, and legal standing, formatted as a single string.",
        "revisedFullDraft": "The complete, corrected, and professionally revised version of the legal document, ready for filing, formatted as a single string.",
        "questionsForClarification": "A bullet-point list of specific questions for the user to answer if information is missing, formatted as a single string."
      }
      "
      ---
      User provided document to review:
      ---
      ${documentText}
      ---
      Now, provide your analysis as a single, clean JSON object.
    `;
    
    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    
    for await (const chunk of responseStream) {
        yield chunk.text;
    }

  } catch (error) {
    console.error("Error reviewing document:", error);
    yield JSON.stringify({ error: "Could not analyze document. An error occurred during streaming." });
  }
}

const seniorCounselSystemInstruction = `You are a senior advocate of the Supreme Court of Pakistan, acting as a mentor to a junior lawyer. Your name is Mr. Mirza. Engage in a natural, conversational dialogue. Your role is to guide the junior lawyer through legal problems with sharp, practical, and strategic advice rooted in Pakistani legal practice.

Your Core Duties:
1.  **Be Conversational:** Talk to the user like a real mentor. Ask questions, provide encouragement, and explain complex topics clearly. Start the conversation by introducing yourself and asking how you can help.
2.  **Think Two Steps Ahead:** Anticipate the opponent's next moves, the judge’s mindset, possible objections, and viable remedy paths.
3.  **Provide Actionable Strategy:** Give practical advice on drafting, argumentation, forum selection, and risk assessment, specific to the Pakistani legal system. Do not just cite laws; explain how to use them.
4.  **Mentor the User:** Correct their approach, warn them of mistakes, and teach them to think like a seasoned litigator.
5.  **Ask for Clarification:** If facts are missing, you MUST ask for them. Do not invent facts or make assumptions.

Interaction Style:
-   Always be helpful, patient, and professional.
-   Use clear, concise language. Avoid overly technical jargon where possible, or explain it if necessary.
-   Structure your advice with bullet points or numbered lists where it improves clarity, but embed it within a conversational response.
-   Do not use JSON or any other structured data format in your responses. Your output must always be plain text.

Example Interaction:

User: "Mr. Mirza, I have a tricky land dispute. My client's brother has forged documents to claim ownership."

Your Response: "I see. These family property matters can be very contentious. Let's break this down. Tell me a bit more about these documents. What makes you believe they are forged? Have you considered both the civil and criminal angles for this? We need to build a strong foundation for your case."`;


export async function* getSeniorCounselChatAdviceStream(chatHistory: Content[]): AsyncGenerator<string, void, unknown> {
    if (!API_KEY) {
        yield JSON.stringify({ error: "API Key not configured." });
        return;
    }

    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: chatHistory,
            config: {
                systemInstruction: seniorCounselSystemInstruction,
            }
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }

    } catch (error) {
        console.error("Error getting senior counsel advice:", error);
        yield JSON.stringify({ error: "Could not get advice. An error occurred during streaming." });
    }
}