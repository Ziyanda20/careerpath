# 🎓 CareerPath SA

> Free AI-powered career guidance for South African Grade 11, Grade 12 and gap year learners.

Upload your report card → get your APS automatically → see every university and TVET course you qualify for.

---

## Features

- **📄 OCR report card reader** — upload PDF, JPG or PNG, any school format
- **🧮 Automatic APS calculator** — instant score for all SA institutions
- **🎯 Course matching** — filter by faculty, province, institution type
- **🤖 AI career chatbot** — personalised guidance via OpenAI
- **📈 Grade 11 progress tracker** — track APS across all 4 terms
- **✨ What-if simulator** — see how improving marks unlocks new courses
- **🔐 Authentication** — secure email/password login with JWT

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Next.js 14, Tailwind CSS          |
| Backend   | Python, FastAPI                   |
| Database  | MongoDB (local)                   |
| Auth      | JWT (python-jose) + bcrypt        |
| OCR       | Tesseract + PyMuPDF               |
| AI        | OpenAI GPT-3.5 Turbo              |

---

## Quick Start (Windows)

### Prerequisites
Install these first (one-time):
1. **Node.js** — https://nodejs.org (LTS version)
2. **Python 3.11+** — https://python.org/downloads *(tick "Add to PATH")*
3. **Git** — https://git-scm.com
4. **MongoDB Community** — https://www.mongodb.com/try/download/community
5. **Tesseract OCR** — https://github.com/UB-Mannheim/tesseract/wiki

### First-time setup

```bash
git clone https://github.com/YOUR_USERNAME/careerpath-sa.git
cd careerpath-sa
setup.bat
```

Then edit `backend/.env`:
```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=careerpath_sa
JWT_SECRET=pick-any-long-random-string
OPENAI_API_KEY=sk-your-openai-key
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Seed the course database (run once):
```bash
cd scripts
python seed_database.py
```

### Start the app (every time)

```bash
start.bat
```

Then open **http://localhost:3000** in your browser.

---

## Project Structure

```
careerpath-sa/
├── backend/
│   ├── main.py               ← FastAPI entry point
│   ├── database.py           ← MongoDB connection
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py           ← Register, login, JWT
│   │   ├── aps.py            ← APS calculation & course matching
│   │   ├── upload.py         ← File upload & OCR
│   │   ├── chatbot.py        ← AI career chat
│   │   ├── grade11.py        ← Progress tracking & what-if
│   │   └── courses.py        ← Course browsing & filtering
│   └── services/
│       ├── auth_service.py   ← Password hashing, JWT tokens
│       ├── aps_service.py    ← APS logic, course matching
│       ├── ocr_service.py    ← Tesseract OCR, subject parsing
│       └── chatbot_service.py← OpenAI integration
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.js           ← Landing page
│       │   ├── (auth)/login/     ← Login page
│       │   ├── (auth)/register/  ← Register page
│       │   ├── dashboard/        ← Home after login
│       │   ├── upload/           ← Upload report card
│       │   ├── results/          ← Qualifying courses
│       │   ├── chatbot/          ← AI career chat
│       │   └── grade11/          ← Progress tracker
│       ├── components/
│       │   └── layout/Navbar.js
│       ├── context/AuthContext.js
│       └── lib/api.js            ← All API calls
├── scripts/
│   └── seed_database.py      ← Populate courses DB
├── setup.bat                 ← First-time setup
├── start.bat                 ← Start both servers
└── .gitignore
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, get JWT token |
| GET | `/auth/me` | Get current user |
| POST | `/aps/calculate` | Calculate APS + matching courses |
| POST | `/upload/report-card` | Upload & OCR report card |
| POST | `/chat/message` | Send message to CareerBot |
| GET | `/courses/` | Browse/filter courses |
| POST | `/grade11/term-result` | Save term marks |
| POST | `/grade11/what-if` | What-if APS simulation |

Full interactive docs at: **http://localhost:8000/docs**

---

## Subject: ISJ107V 2026 — Tshwane University of Technology
