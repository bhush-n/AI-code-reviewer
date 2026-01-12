from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
import streamlit as st
import json


llm = ChatGroq(
    model="llama-3.1-8b-instant", temperature=0, api_key=st.secrets["GROQ_API_SECRET"]
)


def generate_title(code):
    prompt = PromptTemplate(
        input_variables=["code_snippet"],
        template="""
You are a helpful assistant that generates concise and descriptive titles for code reviews.
Generate a short title (max 6 words) for the following code snippet:
{code_snippet}
    """,
    )
    chain = prompt | llm
    response = chain.invoke({"code_snippet": code})
    return response.text.strip().strip('"')


def review_code(code, language):
    language_check_prompt = PromptTemplate(
        input_variables=["language"],
        template="""
        You are a talented llm and you know which language code is pasted for review.
Determine if the following language is valid for code review: {language}
If valid, respond with Valid example. If not, respond with the example in selected language and notify that you have selected the wrong language.
        """,
    )
    lang_chain = language_check_prompt | llm

    prompt = PromptTemplate(
        input_variables=["code", "language"],
        template="""
You are a senior software engineer.

Review the following {language} code and provide constructive feedback, identify potential issues, suggest improvements, and highlight best practices.

Code:
{code}
""",
    )

    chain = (
        {
            "lang_check": lang_chain,
            "code": lambda x: x["code"],
            "language": lambda x: x["language"],
        }
        | prompt
        | llm
    )
    response = chain.invoke({"code": code, "language": language})

    # Generate a title for the code review
    title = generate_title(code)

    try:
        with open("db.json", "r") as db_file:
            chats = json.load(db_file)
    except (FileNotFoundError, json.JSONDecodeError):
        chats = []

    if not any(chat["title"] == title and chat["code"] == code for chat in chats):
        chats.append(
            {
                "title": title,
                "code": code,
                "language": language,
                "response": response.text,
            }
        )

    with open("db.json", "w") as db_file:
        json.dump(chats, db_file, indent=4)

    return response.text
