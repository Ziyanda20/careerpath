from openai import OpenAI
from dotenv import load_dotenv
import os
import re

load_dotenv()
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY", ""),
    base_url="https://api.groq.com/openai/v1",
)

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
- Write in plain text only. Do NOT use markdown: no asterisks, no # headings, no tables, no horizontal lines, no bold or italics
- If you need a list, put each item on its own line starting with a dash and a space
- Use short paragraphs separated by a blank line
- Never suggest the learner apply for courses outside your knowledge — always say "check the institution's website to confirm current requirements"

If the learner speaks in Zulu, Sotho, Xhosa or Afrikaans, respond in that language."""


def clean_reply(text: str) -> str:
    """Strip markdown so replies show as clean, readable plain text."""
    if not text:
        return ""
    lines = []
    for line in text.replace("\u2011", "-").replace("\u2010", "-").splitlines():
        stripped = line.strip()
        # drop horizontal rules and table separator rows (---, |---|---|)
        if re.fullmatch(r"[\s|:\-_=*]{3,}", stripped):
            continue
        # table row -> "cell, cell, cell"
        if stripped.startswith("|") and stripped.endswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|") if c.strip()]
            line = ": ".join(cells[:1]) + (" - " + ", ".join(cells[1:]) if len(cells) > 1 else "")
            stripped = line.strip()
        # headings
        stripped = re.sub(r"^#{1,6}\s*", "", stripped)
        # bullets: *, -, + or numbered stay as a dash bullet
        stripped = re.sub(r"^[*+\u2022]\s+", "- ", stripped)
        # bold / italic / inline code markers
        stripped = re.sub(r"(\*\*|__)(.*?)\1", r"\2", stripped)
        stripped = re.sub(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"\1", stripped)
        stripped = stripped.replace("`", "").replace("*", "")
        lines.append(stripped)
    out = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", out).strip()


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
            model="openai/gpt-oss-120b",
            messages=messages,
            max_tokens=800,
            temperature=0.7,
        )
        return clean_reply(resp.choices[0].message.content)
    except Exception as e:
        return f"Sorry, the chatbot is temporarily unavailable. Please try again shortly. ({str(e)})"