from fastapi import FastAPI, Form, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from pydantic import BaseModel
import bcrypt

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "cv_maker.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, email TEXT UNIQUE, password TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.post("/api/inscription")
async def register(username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # Hash the password directly with bcrypt
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    try:
        c.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", (username, email, hashed_password))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return RedirectResponse(url="/inscription.html?error=email_exists", status_code=303)
    conn.close()
    return RedirectResponse(url="/connection.html", status_code=303)

@app.post("/api/connection")
async def login(email: str = Form(...), password: str = Form(...)):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email=?", (email,))
    user = c.fetchone()
    conn.close()
    
    # user[3] should be the password column (id, username, email, password)
    if user and bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
        return RedirectResponse(url="/cv1.html", status_code=303)
    else:
        return RedirectResponse(url="/connection.html?error=invalid_credentials", status_code=303)

class AnalyzeRequestP(BaseModel):
    url: str
    cv_text: str

@app.post("/api/analyze_cv")
async def analyze_cv(request: AnalyzeRequest):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        res = requests.get(request.url, headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        job_description = soup.get_text(separator=' ', strip=True)[:3000]
    except Exception as e:
        job_description = "Could not scrape. Assuming a generic tech role for demonstration."

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"suggzestions": "⚠️ Backend missing GEMINI_API_KEY. Please provide the key in the Docker environment variables."}
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        You are an expert CV advisor.
        Job Description:
        {job_description}
        
        User's CV info:
        {request.cv_text}
        
        Provide 3 specific, actionable suggestions to improve the CV to match this offer. Output HTML using <ul>, <li>, <b>.
        """
        response = model.generate_content(prompt)
        return {"suggestions": response.text}
    except Exception as e:
        return {"suggezstions": f"Error calling AI: {str(e)}"}
