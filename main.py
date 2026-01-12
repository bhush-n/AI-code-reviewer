import streamlit as st
import lang_helper
import json

st.set_page_config(page_title="AI Code Reviewer", page_icon="🧠", layout="centered")

# Custom CSS
st.markdown(
    """
<style>
.review-box {
    background-color: #f8f9fa;
    padding: 16px;
    border-radius: 12px;
}
.title {
    text-align: center;
    font-size: 34px;
    font-weight: 700;
}

</style>
""",
    unsafe_allow_html=True,
)

# Title
st.markdown(
    "<div class='title'>Lost in Code❓ Get AI-Powered Reviews!</div>",
    unsafe_allow_html=True,
)

# Sidebar
st.sidebar.header("🧠 AI Code Reviewer")

language = st.sidebar.selectbox("Select Language", ("Python", "Django", "JavaScript"))

st.sidebar.header("💬 Start a fresh code review.")
if st.sidebar.button("➕ New Chat"):
    st.rerun()

st.sidebar.header("💬 Past Reviews")
try:
    with open("db.json", "r") as db_file:
        past_chats = json.load(db_file)
        if past_chats:
            # This will now appear in the center because of the CSS above
            st.toast(
                "💡💡 You can also select a past review from the sidebar to view its details."
            )
        for i, chat in enumerate(past_chats):
            if st.sidebar.button(f"{chat['title']}", key=f"chat_button_{i}"):
                st.subheader(f"📝 Review: {chat['title']}")
                st.code(chat["code"], language=chat["language"].lower())
                st.markdown("<div class='review-box'>", unsafe_allow_html=True)
                st.write(chat["response"])
                st.markdown("</div>", unsafe_allow_html=True)
except (FileNotFoundError, json.JSONDecodeError):
    st.sidebar.info("No past reviews found.")

# Rest of your code remains the same...
code_input = st.text_area(
    "📄 Review the code and fix it",
    height=250,
    placeholder="Select the language from sidebar and paste your code...",
)

review_btn = st.button("🔍 Review Code")

if review_btn and code_input.strip():
    with st.spinner("Analyzing your code... 🧪"):
        response = lang_helper.review_code(code_input, language)

    st.subheader("📝 AI Review")
    st.markdown("<div class='review-box'>", unsafe_allow_html=True)
    st.write(response)
    st.markdown("</div>", unsafe_allow_html=True)

elif review_btn:
    st.warning("⚠️ Please paste some code first.")
