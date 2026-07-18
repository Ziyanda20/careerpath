from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

SYSTEM_PROMPT = """You are CareerBot, a friendly South African career guidance counsellor 
helping Grade 11 and Grade 12 learners and gap year students choose university or TVET college courses.

Your job:
- Ask about the learner's interests, hobbies, and what they enjoy at school
- Based on their interests AND their APS score (if provided), suggest specific courses they qualify for
- Mention real South African universities: UCT, Wits, UP, UJ, UKZN, NWU, SU, RU, UNISA, CUT, MUT, DUT, TUT, VUT, WSU, UFH, UFS, UL, UNIVEN, SMU, SPU, SEFAKO
- Also mention TVET colleges when appropriate
- Explain what the career involves day-to-day
- Encourage learners from disadvantaged backgrounds — remind them that bursaries exist (NSFAS, Funza Lushaka, mining/engineering bursaries)
- If a learner's APS is low for their dream career, be honest but encouraging — explain what to improve
- Keep responses concise, warm, and written in plain English (Grade 10 reading level)
- You may use simple bullet points
- Never suggest the learner apply for courses outside your knowledge — always say "check the institution's website to confirm current requirements"

If the learner speaks in Zulu, Sotho, Xhosa or Afrikaans, respond in that language."""


def chat(message: str, history: list, aps_score: int = None) -> str:
    """
    message:  latest user message
    history:  list of {"role": "user"|"assistant", "content": "..."}
    aps_score: optional integer
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if aps_score is not None:
        messages.append({
            "role": "system",
            "content": f"This learner's current APS score is {aps_score}."
        })

    for h in history[-10:]:   # keep last 10 exchanges for context
        messages.append({"role": h["role"], "content": h["content"]})

    messages.append({"role": "user", "content": message})

    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"Sorry, the chatbot is temporarily unavailable. Please try again shortly. ({str(e)})"
