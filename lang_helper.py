from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
import streamlit as st
import json


llm = ChatGroq(
    model="llama-3.1-8b-instant", temperature=0, api_key=st.secrets["GROQ_API_SECRET"]
)


def review_code(code, language):
    prompt = PromptTemplate(
        input_variables=["code", "language"],
        template="""
You are a senior software engineer.

Review the following {language} code and provide:
1. Bugs or issues
2. Performance improvements
3. Best practices
4. Security concerns (if any)
5. Conventions

Code:
{code}
""",
    )

    chain = prompt | llm
    response = chain.invoke({"code": code, "language": language})

    try:
        with open("db.json", "r") as db_file:
            chats = json.load(db_file)
    except (FileNotFoundError, json.JSONDecodeError):
        chats = []

    chats.append({"code": code, "language": language, "response": response.text})

    with open("db.json", "w") as db_file:
        json.dump(chats, db_file, indent=4)

    return response.text
