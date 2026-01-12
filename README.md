# 🧠 AI Code Reviewer

An AI-powered code review application that helps developers instantly analyze their code for **bugs, performance issues, best practices, and security concerns** using Large Language Models.

Built with **Streamlit** for UI and **modern LangChain (LCEL)** with **Groq LLMs** for fast and reliable responses.

---

## Live APP: https://ai-code-reviewer-lang-groq.streamlit.app/

## 🚀 Features

* 🔍 Review Python / Django / JavaScript code
* 🐞 Detect bugs and logical issues
* ⚡ Suggest performance optimizations
* ✅ Recommend best practices
* 🔐 Highlight potential security concerns
* 🎨 Clean & user-friendly Streamlit UI

---

## 🛠️ Tech Stack

* **Python 3.9+**
* **Streamlit** – UI framework
* **LangChain (LCEL)** – Prompt & pipeline handling
* **Groq LLM (LLaMA 3.1)** – Code analysis

---

## 📂 Project Structure

```
AI-Code-Reviewer/
│
├── main.py              # Streamlit UI
├── lang_helper.py       # LLM logic & prompts
├── requirements.txt     # Dependencies
└── README.md            # Project documentation
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/ai-code-reviewer.git
cd ai-code-reviewer
```

### 2️⃣ Create virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate  # Linux / Mac
venv\Scripts\activate     # Windows
```

### 3️⃣ Install dependencies

```bash
pip install -r requirements.txt
```

---

## 🔑 Environment Variables

Create a `.env` file (or export directly):

```env
GROQ_API_KEY=your_groq_api_key_here
```

> Make sure your API key is valid and active.

---

## ▶️ Run the Application

```bash
streamlit run main.py
```

Open browser at:

```
http://localhost:8501
```

---

## 🧠 How It Works

1. User pastes code into the UI
2. Selects the programming language
3. Code is sent to the LLM with a structured prompt
4. AI analyzes and returns:

   * Bugs / Issues
   * Performance improvements
   * Best practices
   * Security suggestions

---

## 📸 Screenshots

<img width="1920" height="864" alt="image" src="https://github.com/user-attachments/assets/eaf846eb-5f07-403a-888e-7f8ba98af9e5" />
<img width="298" height="486" alt="image" src="https://github.com/user-attachments/assets/b49db4d8-ffc5-4283-9991-9f2c96489c61" />
<img width="825" height="594" alt="image" src="https://github.com/user-attachments/assets/bbafa9a8-f0e4-4882-b9e6-c6f9698688b1" />
<img width="1915" height="925" alt="image" src="https://github.com/user-attachments/assets/1e8f5a6e-159f-4680-96b8-ce320b28a679" />





---

## 🌱 Future Enhancements

* Severity levels (Critical / Warning / Info)
* Line-by-line suggestions
* Export review as PDF
* GitHub repository analyzer
* Multi-language support

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork the repo and submit a pull request.

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Author

**Bhushan Chaudhari**
Software Engineer | Python | Django | Backend | GenAI

---

⭐ If you like this project, don’t forget to star the repository!
