"""
Gestión de Comedores — Residencia Geriátrica
Main Streamlit application with authentication, admin panel, and component rendering.
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

# ─── Premium Login CSS ───────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

/* Hide Streamlit chrome */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
.stDeployButton {display: none;}
header[data-testid="stHeader"] {display: none;}

/* Global font */
html, body, [class*="st-"] {
    font-family: 'Outfit', sans-serif !important;
}

/* When app is loaded, remove padding */
.block-container {
    padding-top: 1rem !important;
    padding-bottom: 0 !important;
}
</style>
""", unsafe_allow_html=True)


# ─── Data Store (cached as singleton) ─────────────────────────────────────────
@st.cache_resource
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
if "app_state" not in st.session_state:
    st.session_state.app_state = None


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
    .login-logo {
        text-align: center; margin-bottom: 1.5rem;
    }
    .login-logo .icon { font-size: 3rem; }
    .login-logo h2 {
        margin: 0.5rem 0 0 0; font-weight: 700; color: #1e293b;
        font-size: 1.4rem; letter-spacing: -0.02em;
    }
    .login-logo p {
        color: #64748b; font-size: 0.9rem; margin-top: 0.25rem;
    }
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
            st.session_state.app_state = None
            store.invalidate_cache()
            st.rerun()

        st.markdown("---")

        # Force cloud reload
        if st.button("🔄 Recargar desde la Nube", use_container_width=True):
            store.invalidate_cache()
            st.session_state.app_state = None
            st.rerun()

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


# ─── Register the Custom Component ───────────────────────────────────────────
_comedores_component = components.declare_component(
    "comedores",
    path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "components", "comedores"),
)


def comedores_component(state, role, username, key="comedores_main"):
    """Render the comedores UI component and return updated state if user saves."""
    return _comedores_component(
        state=state,
        role=role,
        username=username,
        key=key,
        default=None,
    )


# ─── Main App ────────────────────────────────────────────────────────────────
def show_app():
    # Load state from cloud if not cached
    if st.session_state.app_state is None:
        with st.spinner("Cargando datos desde la nube..."):
            st.session_state.app_state = store.load_state()
            if not st.session_state.app_state:
                st.session_state.app_state = {}  # empty = component will use defaults

    # Render the component
    result = comedores_component(
        state=st.session_state.app_state,
        role=st.session_state.user["role"],
        username=st.session_state.user["username"],
    )

    # If the component sent back updated state (user clicked Save)
    if result is not None:
        st.session_state.app_state = result
        store.save_state(result)
        store.log_activity(
            st.session_state.user["username"],
            "Guardó cambios en la nube",
        )


# ─── Run ──────────────────────────────────────────────────────────────────────
if st.session_state.user is None:
    show_login_page()
    st.stop()

show_admin_sidebar()
show_app()
