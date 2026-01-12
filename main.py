import streamlit as st
import lang_helper

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
st.markdown("<div class='title'>🧠 AI Code Reviewer</div>", unsafe_allow_html=True)

# Sidebar
st.sidebar.header("⚙️ Settings")
language = st.sidebar.selectbox("Select Language", ("Python", "Django", "JavaScript"))

# Code Input
code_input = st.text_area(
    "📄 Review the code and fix it",
    height=250,
    placeholder="Select the language from sidebar and paste your code...",
)

review_btn = st.button("🔍 Review Code")

# Logic
if review_btn and code_input.strip():
    with st.spinner("Analyzing your code... 🧪"):
        response = lang_helper.review_code(code_input, language)

    st.subheader("📝 AI Review")
    st.markdown("<div class='review-box'>", unsafe_allow_html=True)
    st.write(response)
    st.markdown("</div>", unsafe_allow_html=True)

elif review_btn:
    st.warning("⚠️ Please paste some code first.")
