"""
Gestión de Comedores — Residencia Geriátrica
Main Streamlit application with authentication, admin panel, and cloud-persisted UI.
"""
import streamlit as st
import streamlit.components.v1 as components
import json
import hashlib
import os
from datetime import datetime
from data_store import DataStore

# ─── Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Gestión de Comedores · Residencia",
    page_icon="🍽️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─── Premium CSS ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
.stDeployButton {display: none;}
header[data-testid="stHeader"] {display: none;}
html, body, [class*="st-"] { font-family: 'Outfit', sans-serif !important; }
.block-container { padding-top: 1rem !important; padding-bottom: 0 !important; max-width: 100% !important; }
iframe { border: none !important; }
</style>
""", unsafe_allow_html=True)


# ─── Data Store ───────────────────────────────────────────────────────────────
def get_store():
    return DataStore()

store = get_store()


# ─── Auth Helpers ─────────────────────────────────────────────────────────────
ADMIN_USERNAME = "rmigliore"


def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _load_users() -> dict:
    return store.load_users()


def _save_users(users: dict):
    store.save_users(users)


def authenticate(username: str, password: str):
    """Return user dict if credentials valid, else None."""
    store.invalidate_cache()
    users = _load_users()
    user = users.get(username.lower())
    if user and user["password_hash"] == hash_pw(password):
        return {"username": user["username"], "role": user["role"]}
    return None


def is_admin() -> bool:
    u = st.session_state.get("user")
    return u is not None and u.get("role") == "admin"


# ─── Session State Init ──────────────────────────────────────────────────────
if "user" not in st.session_state:
    st.session_state.user = None


# ─── Login Page ───────────────────────────────────────────────────────────────
def show_login_page():
    st.markdown("""
    <style>
    .login-container {
        max-width: 420px; margin: 5vh auto; padding: 2.5rem;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 20px; border: 1px solid #e2e8f0;
        box-shadow: 0 20px 60px rgba(0,0,0,0.08);
    }
    .login-logo { text-align: center; margin-bottom: 1.5rem; }
    .login-logo .icon { font-size: 3rem; }
    .login-logo h2 {
        margin: 0.5rem 0 0 0; font-weight: 700; color: #1e293b;
        font-size: 1.4rem; letter-spacing: -0.02em;
    }
    .login-logo p { color: #64748b; font-size: 0.9rem; margin-top: 0.25rem; }
    </style>
    <div class="login-container">
        <div class="login-logo">
            <div class="icon">🍽️</div>
            <h2>Gestión de Comedores</h2>
            <p>Residencia Geriátrica</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.2, 1])
    with col2:
        with st.form("login_form", clear_on_submit=False):
            username = st.text_input("👤 Usuario", placeholder="Ingresa tu nombre de usuario")
            password = st.text_input("🔒 Contraseña", type="password", placeholder="Contraseña")
            submitted = st.form_submit_button("Ingresar", use_container_width=True, type="primary")

            if submitted:
                if not username or not password:
                    st.error("Por favor ingresa usuario y contraseña.")
                else:
                    user = authenticate(username.strip(), password)
                    if user:
                        st.session_state.user = user
                        store.log_activity(user["username"], "Inicio de sesión")
                        st.rerun()
                    else:
                        st.error("❌ Credenciales incorrectas.")


# ─── Admin Sidebar ────────────────────────────────────────────────────────────
def show_admin_sidebar():
    with st.sidebar:
        st.markdown("### 🔐 Sesión Activa")
        user = st.session_state.user
        role_label = "👑 Administrador" if user["role"] == "admin" else "👀 Visor"
        st.markdown(f"**{user['username']}** — {role_label}")

        if st.button("🚪 Cerrar Sesión", use_container_width=True):
            store.log_activity(user["username"], "Cerró sesión")
            st.session_state.user = None
            store.invalidate_cache()
            st.rerun()

        st.markdown("---")

        if is_admin():
            st.markdown("### 👑 Panel de Administración")

            # ── Add User ──
            with st.expander("➕ Agregar Usuario"):
                with st.form("add_user_form", clear_on_submit=True):
                    new_user = st.text_input("Nombre de usuario")
                    new_pass = st.text_input("Contraseña", type="password")
                    new_role = st.selectbox("Rol", ["viewer", "admin"])
                    if st.form_submit_button("Crear Usuario"):
                        if new_user and new_pass:
                            users = _load_users()
                            key = new_user.strip().lower()
                            if key in users:
                                st.error("El usuario ya existe.")
                            else:
                                users[key] = {
                                    "username": key,
                                    "password_hash": hash_pw(new_pass),
                                    "role": new_role,
                                    "created_at": datetime.now().isoformat(),
                                }
                                _save_users(users)
                                store.log_activity(
                                    st.session_state.user["username"],
                                    f"Creó el usuario '{key}' con rol '{new_role}'",
                                )
                                st.success(f"✅ Usuario '{key}' creado.")
                        else:
                            st.warning("Completa todos los campos.")

            # ── User List ──
            with st.expander("👥 Usuarios Registrados"):
                store.invalidate_cache()
                users = _load_users()
                for uname, udata in users.items():
                    col_a, col_b = st.columns([3, 1])
                    role_icon = "👑" if udata["role"] == "admin" else "👀"
                    col_a.markdown(f"{role_icon} **{uname}**")
                    if uname != ADMIN_USERNAME and col_b.button("🗑️", key=f"del_{uname}"):
                        del users[uname]
                        _save_users(users)
                        store.log_activity(
                            st.session_state.user["username"],
                            f"Eliminó el usuario '{uname}'",
                        )
                        st.rerun()

            # ── Activity Log ──
            with st.expander("📋 Registro de Actividad"):
                log = store.load_activity_log()
                if log:
                    for entry in log[:50]:
                        ts = entry.get("timestamp", "")[:16].replace("T", " ")
                        st.caption(f"`{ts}` — **{entry.get('user', '?')}**: {entry.get('action', '')}")
                else:
                    st.info("Sin actividad registrada.")


# ─── Render the App (inline HTML/CSS/JS) ─────────────────────────────────────
def show_app():
    user = st.session_state.user
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Read source files
    with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
        html_content = f.read()
    with open(os.path.join(base_dir, "styles.css"), "r", encoding="utf-8") as f:
        css_content = f.read()
    with open(os.path.join(base_dir, "app.js"), "r", encoding="utf-8") as f:
        js_content = f.read()

    # Load cloud state
    cloud_state = store.load_state()
    if not cloud_state:
        cloud_state = {}

    # Inline CSS
    html_content = html_content.replace(
        '<link rel="stylesheet" href="styles.css?v=10">',
        f"<style>\n{css_content}\n</style>"
    )

    # Inject cloud config + state BEFORE the app.js runs
    injection_script = f"""<script>
    window._CLOUD_STATE = {json.dumps(cloud_state, ensure_ascii=False)};
    window._USER_ROLE = '{user["role"]}';
    window._USERNAME = '{user["username"]}';
    window._GITHUB_TOKEN = '{store.token}';
    window._GIST_ID = '{store.gist_id}';
    </script>"""

    # Replace the app.js reference with injection + inlined JS
    html_content = html_content.replace(
        '<script src="app.js?v=35"></script>',
        f"{injection_script}\n<script>\n{js_content}\n</script>"
    )

    # Render the full app
    components.html(html_content, height=900, scrolling=True)


# ─── Run ──────────────────────────────────────────────────────────────────────
if st.session_state.user is None:
    show_login_page()
    st.stop()

show_admin_sidebar()
show_app()
