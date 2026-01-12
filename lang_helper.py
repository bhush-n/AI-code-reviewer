from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()


llm = ChatGroq(
    model="llama-3.1-8b-instant", temperature=0, api_key=os.getenv("GROQ_API_SECRET")
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

Code:
{code}
""",
    )

    chain = prompt | llm
    response = chain.invoke({"code": code, "language": language})

    return response.content
