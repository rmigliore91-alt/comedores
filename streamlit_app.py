import streamlit as st
import os

st.set_page_config(
    page_title="Gestión de Comedores · Residencia",
    page_icon="🍽️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Hide Streamlit chrome to give the embedded app full real-estate
st.markdown("""
<style>
    /* Hide header, footer, menu */
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    .stDeployButton {display: none;}

    /* Remove default padding so the iframe fills the viewport */
    .block-container {
        padding: 0 !important;
        max-width: 100% !important;
    }
    .stApp > header {display: none;}
    section[data-testid="stSidebar"] {display: none;}

    /* Make the iframe wrapper fill the screen */
    iframe {
        border: none !important;
    }
</style>
""", unsafe_allow_html=True)

# ── Read and inline all assets into a single HTML string ──────────────────
base_dir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(base_dir, "styles.css"), "r", encoding="utf-8") as f:
    css_content = f.read()

with open(os.path.join(base_dir, "app.js"), "r", encoding="utf-8") as f:
    js_content = f.read()

with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
    html_content = f.read()

# Replace external CSS link with inline <style>
html_content = html_content.replace(
    '<link rel="stylesheet" href="styles.css?v=10">',
    f"<style>\n{css_content}\n</style>"
)

# Replace external JS script with inline <script>
html_content = html_content.replace(
    '<script src="app.js?v=35"></script>',
    f"<script>\n{js_content}\n</script>"
)

# Render the full app inside a Streamlit component
st.components.v1.html(html_content, height=900, scrolling=True)
