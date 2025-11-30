// ============================================
// TURNSTILE CALLBACKS - DEVEM ESTAR NO ESCOPO GLOBAL ANTES DO DOM CARREGAR
// ============================================
window._turnstileToken = null;
window._turnstileVerifiedAt = null;
window._turnstileReady = false;

window.onTurnstileSuccess = function(token) {
    console.log('[Turnstile] ✅ Verification successful, token received');
    window._turnstileToken = token;
    window._turnstileVerifiedAt = Date.now();
    
    // Habilita os botões imediatamente
    ['btnMethod1', 'btnMethod2', 'btnMethod3'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('disabled');
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
        }
    });
    
    // Atualiza o hint
    const hint = document.getElementById('turnstileHint');
    if (hint) {
        hint.textContent = '✅ Verificado! Selecione um método abaixo';
        hint.style.color = '#4CAF50';
    }
    
    // Sincroniza com appState quando disponível
    if (window._syncTurnstileState) {
        window._syncTurnstileState(token);
    }
};

window.onTurnstileError = function() {
    console.error('[Turnstile] ❌ Verification failed');
    window._turnstileToken = null;
    alert('Erro na verificação Cloudflare. Recarregue a página.');
};

window.onTurnstileExpired = function() {
    console.warn('[Turnstile] ⚠️ Token expired');
    window._turnstileToken = null;
    
    // Desabilita os botões
    ['btnMethod1', 'btnMethod2', 'btnMethod3'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        }
    });
    
    // Reseta o hint
    const hint = document.getElementById('turnstileHint');
    if (hint) {
        hint.textContent = 'Complete a verificação acima para desbloquear os métodos';
        hint.style.color = '#888';
    }
    
    // Reseta o widget
    if (window.turnstile) {
        const widget = document.querySelector('.cf-turnstile');
        if (widget) window.turnstile.reset(widget);
    }
};

// ============================================
// MAIN APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        // URL da API já definida para produção
        API_BASE_URL: 'https://keygenx-1.onrender.com',
        REQUEST_TIMEOUT: 15000, // 15 segundos timeout para requests
        SHORTENER_URLS: {
            1: 'https://link-target.net/63830/among-us-modmenu-key1',
            2: 'https://link-target.net/63830/DXuC2z7SQT1o',
            3: 'https://link-hub.net/63830/tQtGDD3vTskf'
        },
        MAX_KEY_LIMIT: 5,
        COOLDOWN_DURATION: 30000,
        BACKEND_VERIFICATION_TOKEN_KEY: '_vt_' + btoa('mhq').substring(0, 4),
        // Configuração dos Retornos (O que o site espera receber do encurtador)
        RETURN_CONFIG: {
            1: { action: 'complete_m1', status: 'success' },
            2: { action: 'complete_m2', status: 'success' },
            3: { action: 'complete_m3', status: 'success' }
        }
    };

    const elements = {
        btnOpenMethodMenu: document.getElementById('btnOpenMethodMenu'),
        methodSelectionModal: document.getElementById('methodSelectionModal'),
        closeMethodModal: document.getElementById('closeMethodModal'),
        btnMethod1: document.getElementById('btnMethod1'),
        btnMethod2: document.getElementById('btnMethod2'),
        btnMethod3: document.getElementById('btnMethod3'),
        btnView: document.getElementById('viewKeysBtn'),
        keyContainerEl: document.getElementById('keyContainer'),
        keyValueEl: document.getElementById('keyValue'),
        messageEl: document.getElementById('message'),
        keysListUl: document.getElementById('keysList'),
        starfieldCanvas: document.getElementById('starfield-canvas'),
        copyButton: document.getElementById('copyButton'),
        keyActions: document.getElementById('keyActions'),
        keyMetadata: document.getElementById('keyMetadata'),
        keyTimestamp: document.getElementById('keyTimestamp'),
        cooldownSection: document.getElementById('cooldownSection'),
        cooldownTime: document.getElementById('cooldownTime'),
        progressBar: document.getElementById('progressBar'),
        progressFill: document.getElementById('progressFill'),
        achievementPopup: document.getElementById('achievementPopup'),
        keyLimitSection: document.getElementById('keyLimitSection'),
        keyLimitInfo: document.getElementById('keyLimitInfo'),
        keyLimitText: document.getElementById('keyLimitText'),
        keyLimitHelper: document.getElementById('keyLimitHelper'),
        translateButton: document.getElementById('translateButton'),
        supportButton: document.getElementById('supportButton'),
        discordWidgetContainer: document.getElementById('discordWidgetContainer'),
        overlay: document.getElementById('overlay'),
        closeWidget: document.getElementById('closeWidget'),
        discordAuthBtn: document.getElementById('discordAuthBtn'),
        userProfileModal: document.getElementById('userProfileModal'),
        modalUserAvatar: document.getElementById('modalUserAvatar'),
        modalUserName: document.getElementById('modalUserName'),
        modalUserDiscriminator: document.getElementById('modalUserDiscriminator'),
        modalServerStatus: document.getElementById('modalServerStatus'),
        statKeysToday: document.getElementById('statKeysToday'),
        statTotalKeys: document.getElementById('statTotalKeys'),
        statActiveKeys: document.getElementById('statActiveKeys'),
        statMemberSince: document.getElementById('statMemberSince'),
        modalGenerateBtn: document.getElementById('modalGenerateBtn'),
        modalLogoutBtn: document.getElementById('modalLogoutBtn'),
        userProfileHeader: document.getElementById('userProfileHeader'),
        userAvatarHeader: document.getElementById('userAvatarHeader'),
        userNameHeader: document.getElementById('userNameHeader'),
        userDiscriminatorHeader: document.getElementById('userDiscriminatorHeader'),
        authSection: document.getElementById('authSection'),
        userContent: document.getElementById('userContent'),
        helpButton: document.getElementById('helpButton'),
        tutorialModal: document.getElementById('tutorialModal'),
        closeTutorialModal: document.getElementById('closeTutorialModal'),
        accessGrantedOverlay: document.getElementById('accessGrantedOverlay')
    };

    const appState = {
        userKeys: [],
        soundEnabled: false,
        cooldownTimer: null,
        keyGenerationCount: 0,
        lastKeyGenerationTime: 0,
        isInCooldown: false,
        audioContext: null,
        isProcessing: false,
        currentLanguage: navigator.language.startsWith('pt') ? 'pt' : 'en',
        turnstileToken: window._turnstileToken || null,
        turnstileVerifiedAt: window._turnstileVerifiedAt || null
    };

    // Sincroniza o token global com o appState
    window._syncTurnstileState = function(token) {
        appState.turnstileToken = token;
        appState.turnstileVerifiedAt = Date.now();
        console.log('[Turnstile] State synced with appState');
    };

    // Se já foi verificado antes do DOM carregar, sincroniza
    if (window._turnstileToken) {
        appState.turnstileToken = window._turnstileToken;
        appState.turnstileVerifiedAt = window._turnstileVerifiedAt;
        console.log('[Turnstile] Pre-existing token synced');
    }

    function enableMethodButtons() {
        ['btnMethod1', 'btnMethod2', 'btnMethod3'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
        });
    }

    function disableMethodButtons() {
        ['btnMethod1', 'btnMethod2', 'btnMethod3'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            }
        });
    }

    const translations = {
        en: {
            main_title: 'Access Terminal - MIRA HQ',
            main_subtitle: '🧑‍🚀 Crewmate, request your Access ID or check the current cycle logs. Stay alert!',
            status_online: 'MIRA HQ System Online',
            login_discord: 'Login with Discord',
            login_discord_subtitle: 'Fast and secure',
            auth_section_subtitle: 'Authenticate to generate your access key',
            auth_section_hint: '🔒 No write permissions requested',
            cooldown_title: '⚠️ SYSTEM IN COOLDOWN',
            cooldown_subtitle: 'Wait for new request',
            key_limit_text: 'You have {count} active ID(s) (maximum: {max} per Discord account)',
            key_limit_helper: '💡 Use an ID to free up space for new ones.',
            generate_button: '⚠️ START TASK: REGISTRATION',
            view_keys_button: '🛰️ SYSTEM LOG',
            key_label: 'Assigned Crewmate ID:',
            copy_button: '📋 Copy ID',
            generated_at: '📅 Generated at:',
            key_type: '🔑 Type: MIRA HQ Access',
            key_status: '⏱️ Status: Active',
            records_title: 'ID Records - Current Cycle',
            no_records: 'No ID records in this terminal for the current cycle.',
            support_button: '🆘 Support',
            translate_button: '🇧🇷 Back to Portuguese',
            widget_title: 'Support - Discord',
            stat_keys_today: 'Keys Today',
            stat_total_keys: 'Total Keys',
            stat_active_keys: 'Active Keys',
            stat_member_since: 'Member since',
            modal_generate_button: '🚀 Generate New Key',
            modal_logout_button: '🚪 Logout',
            server_verified: '✅ IN SERVER',
            server_missing: '❌ NOT IN SERVER',
            login_required_button: '🔐 LOGIN REQUIRED',
            server_required_button: '🎮 SERVER NOT VERIFIED',
            copied_text: '✅ Copied!',
            member_since_now: 'Today',
            member_since_day: '1 day',
            member_since_days: '{days} days',
            server_required_msg_title: '🎮 You must join our Discord server to generate keys!',
            server_required_msg_btn: '🚀 Join Server',
            server_required_msg_desc: 'After joining, refresh the page and login again.',
            auth_connecting: '🔄 Connecting to Discord...',
            auth_error: '❌ Error connecting to Discord',
            auth_verifying: '🔐 Verifying authentication...',
            auth_failed: '❌ Authentication failed',
            logout_success: '👋 Logout successful',
            processing_auth: 'AUTHENTICATING...',
            connecting_server: '🛰️ Connecting to server...',
            key_valid: '✅ Valid Access ID!',
            first_access: 'First Access!',
            veteran_crewmate: 'Veteran Crewmate!',
            security_expert: 'Security Expert!',
            emergency_error: '🚫 EMERGENCY: {error}',
            consulting_log: 'Consulting ID Log...',
            log_loaded: 'Report loaded.',
            no_id_found: 'No ID found.',
            wait_cooldown: '⏱️ WAIT: System in cooldown.',
            limit_reached: '⚠️ LIMIT REACHED: Max 5 IDs.',
            starting_verification: '⏳ Starting verification...',
            redirecting_portal: '⏳ Redirecting to portal...',
            unknown_error: 'Unknown error.',
            verification_complete: '✅ Verification complete! Requesting ID...',
            system_ready: '✅ System ready!',
            select_method_title: 'Select Method',
            select_method_desc: 'Choose one of the options below to start verification:',
            method_1: 'Method 1 (Recommended)',
            method_1_desc: 'Faster and more stable',
            method_2: 'Method 2',
            method_2_desc: 'Quick alternative',
            method_3: 'Method 3',
            method_3_desc: 'Alternative server',
            tutorial_title: 'How to Activate',
            step_1_title: 'Open Among Us',
            step_1_desc: 'Start the game with the mod installed.',
            step_2_title: 'Press F1',
            step_2_desc: 'In the main menu or lobby, press F1 to open the panel.',
            step_3_title: 'Paste Key',
            step_3_desc: 'Copy the key generated here and paste it into the mod activation field.',
            help_button_title: 'How to use?',
            view_keys_title: 'Consult Active Crewmate IDs',
            download_mod_button: 'Download Mod Menu (GitHub)',
            turnstile_hint: 'Complete the verification above to unlock the methods',
            turnstile_success: '✅ Verified! Select a method below'
        },
        pt: {
            main_title: 'Terminal de Acesso - MIRA HQ',
            main_subtitle: '🧑‍🚀 Tripulante, requisite sua Identificação de Acesso ou verifique os registros do ciclo atual. Mantenha-se alerta!',
            status_online: 'Sistema MIRA HQ Online',
            login_discord: 'Entrar com Discord',
            login_discord_subtitle: 'Rápido e seguro',
            auth_section_subtitle: 'Autentique-se para gerar sua key de acesso',
            auth_section_hint: '🔒 Nenhuma permissão de escrita é solicitada',
            cooldown_title: '⚠️ SISTEMA EM COOLDOWN',
            cooldown_subtitle: 'Aguarde para nova solicitação',
            key_limit_text: 'Você possui {count} ID{s} ativa{s} (máximo: {max} por conta Discord)',
            key_limit_helper: '💡 Use uma ID para liberar espaço para novas.',
            generate_button: '⚠️ INICIAR TASK: REGISTRO',
            view_keys_button: '🛰️ LOG DE SISTEMA',
            key_label: 'ID de Tripulante Designada:',
            copy_button: '📋 Copiar ID',
            generated_at: '📅 Gerada em:',
            key_type: '🔑 Tipo: Acesso MIRA HQ',
            key_status: '⏱️ Status: Ativa',
            records_title: 'Registros de IDs - Ciclo Atual',
            no_records: 'Nenhum registro de ID neste terminal para o ciclo atual.',
            support_button: '🆘 Suporte',
            translate_button: '🇺🇸 Translate to English',
            widget_title: 'Suporte - Discord',
            stat_keys_today: 'Keys Hoje',
            stat_total_keys: 'Total Keys',
            stat_active_keys: 'Keys Ativas',
            stat_member_since: 'Membro desde',
            modal_generate_button: '🚀 Gerar Nova Key',
            modal_logout_button: '🚪 Sair',
            server_verified: '✅ NO SERVIDOR',
            server_missing: '❌ FORA DO SERVIDOR',
            login_required_button: '🔐 LOGIN REQUERIDO',
            server_required_button: '🎮 SERVIDOR NÃO VERIFICADO',
            copied_text: '✅ Copiado!',
            member_since_now: 'Hoje',
            member_since_day: '1 dia',
            member_since_days: '{days} dias',
            server_required_msg_title: '🎮 Você precisa entrar no nosso servidor Discord para gerar keys!',
            server_required_msg_btn: '🚀 Entrar no Servidor',
            server_required_msg_desc: 'Depois de entrar, atualize a página e faça login novamente.',
            auth_connecting: '🔄 Conectando com Discord...',
            auth_error: '❌ Erro ao conectar com Discord',
            auth_verifying: '🔐 Verificando autenticação...',
            auth_failed: '❌ Falha na autenticação',
            logout_success: '👋 Logout realizado com sucesso',
            processing_auth: 'AUTENTICANDO...',
            connecting_server: '🛰️ Conectando com o servidor...',
            key_valid: '✅ ID de Acesso Válida!',
            first_access: 'Primeiro Acesso!',
            veteran_crewmate: 'Tripulante Veterano!',
            security_expert: 'Especialista em Segurança!',
            emergency_error: '🚫 EMERGÊNCIA: {error}',
            consulting_log: 'Consulting Log de IDs...',
            log_loaded: 'Relatório carregado.',
            no_id_found: 'Nenhuma ID encontrada.',
            wait_cooldown: '⏱️ AGUARDE: Sistema em cooldown.',
            limit_reached: '⚠️ LIMITE ATINGIDO: Máximo de 5 IDs.',
            starting_verification: '⏳ Iniciando verificação...',
            redirecting_portal: '⏳ Redirecionando para o portal...',
            unknown_error: 'Erro desconhecido.',
            verification_complete: '✅ Verificação completa! Solicitando ID...',
            system_ready: '✅ Sistema pronto!',
            select_method_title: 'Selecione o Método',
            select_method_desc: 'Escolha uma das opções abaixo para iniciar a verificação:',
            method_1: 'Método 1 (Recomendado)',
            method_1_desc: 'Mais rápido e estável',
            method_2: 'Método 2',
            method_2_desc: 'Alternativa rápida',
            method_3: 'Método 3',
            method_3_desc: 'Servidor alternativo',
            tutorial_title: 'Como Ativar o Mod',
            step_1_title: 'Abra o Among Us',
            step_1_desc: 'Inicie o jogo com o mod instalado.',
            step_2_title: 'Aperte F1',
            step_2_desc: 'No menu principal ou lobby, pressione a tecla F1 para abrir o painel.',
            step_3_title: 'Cole a Key',
            step_3_desc: 'Copie a key gerada aqui e cole no campo de ativação do mod.',
            help_button_title: 'Como usar?',
            view_keys_title: 'Consultar IDs de Tripulantes Ativos',
            download_mod_button: 'Baixar Mod Menu (GitHub)',
            turnstile_hint: 'Complete a verificação acima para desbloquear os métodos',
            turnstile_success: '✅ Verificado! Selecione um método abaixo'
        }
    };

    class DiscordAuthSystem {
        constructor() {
            this.sessionId = localStorage.getItem('crewbot_session');
            this.userData = JSON.parse(localStorage.getItem('crewbot_user') || 'null');
            this.userStats = JSON.parse(localStorage.getItem('crewbot_stats') || 'null');
            this.isAuthenticated = !!this.sessionId;
            this.sessionExpiresAt = parseInt(localStorage.getItem('crewbot_session_expires') || '0');
        }

        async init() {
            this.setupEventListeners();
            this.setupModal();

            if (this.isSessionExpired()) {
                await this.logout();
            } else if (this.sessionId) {
                const isValid = await this.validateSession();
                if (isValid) {
                    await this.loadUserStats();
                }
            }

            this.updateUI();
            this.handleCallbackFromURL();
        }

        isSessionExpired() {
            return Date.now() > this.sessionExpiresAt;
        }

        setupEventListeners() {
            if (elements.discordAuthBtn) elements.discordAuthBtn.addEventListener('click', () => this.startAuth());
            if (elements.userProfileHeader) elements.userProfileHeader.addEventListener('click', () => this.showUserModal());
        }

        setupModal() {
            const closeBtn = document.querySelector('.close-modal');
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideUserModal());
            if (elements.userProfileModal) elements.userProfileModal.addEventListener('click', (e) => { if (e.target === elements.userProfileModal) this.hideUserModal(); });
            if (elements.modalGenerateBtn) elements.modalGenerateBtn.addEventListener('click', () => { this.hideUserModal(); initiateShortenerRedirect(); });
            if (elements.modalLogoutBtn) elements.modalLogoutBtn.addEventListener('click', () => { this.hideUserModal(); this.logout(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && elements.userProfileModal.style.display === 'block') this.hideUserModal(); });

            if (elements.helpButton) elements.helpButton.addEventListener('click', () => { elements.tutorialModal.style.display = 'block'; });
            if (elements.closeTutorialModal) elements.closeTutorialModal.addEventListener('click', () => { elements.tutorialModal.style.display = 'none'; });
            window.addEventListener('click', (e) => { if (e.target === elements.tutorialModal) elements.tutorialModal.style.display = 'none'; });
        }

        async startAuth() {
            try {
                showUIMessage(translations[appState.currentLanguage].auth_connecting, 'info');
                const response = await fetch(`${CONFIG.API_BASE_URL}/auth/discord`);
                const data = await response.json();
                if (data.status === 'success') window.location.href = data.auth_url;
            } catch (error) {
                showUIMessage(translations[appState.currentLanguage].auth_error, 'error');
            }
        }

        async handleCallbackFromURL() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && state) {
                try {
                    showUIMessage(translations[appState.currentLanguage].auth_verifying, 'info');
                    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/discord/callback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, state })
                    });
                    const data = await response.json();
                    if (data.status === 'success') await this.handleAuthSuccess(data);
                    else if (data.status === 'server_required') this.handleServerRequired(data);
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (error) {
                    showUIMessage(translations[appState.currentLanguage].auth_failed, 'error');
                }
            }
        }

        async handleAuthSuccess(data) {
            this.sessionId = data.session_id;
            this.userData = data.user;
            this.isAuthenticated = true;
            this.sessionExpiresAt = Date.now() + CONFIG.SESSION_DURATION_MS;

            localStorage.setItem('crewbot_session', this.sessionId);
            localStorage.setItem('crewbot_user', JSON.stringify(this.userData));
            localStorage.setItem('crewbot_session_expires', this.sessionExpiresAt.toString());

            await this.loadUserStats();
            this.updateUI();
            showUIMessage(data.message, 'success');
            if (appState.soundEnabled) playSoundSequence([{ freq: 523, duration: 100, type: 'sine' }, { freq: 659, duration: 100, type: 'sine' }, { freq: 784, duration: 200, type: 'sine' }]);
            await fetchUserKeyList();
        }

        handleServerRequired(data) {
            const lang = appState.currentLanguage;
            showUIMessage(data.message, 'error', 10000);
            elements.authSection.innerHTML = `
              <div class="server-required-message">
                <p>${translations[lang].server_required_msg_title}</p>
                <a href="${data.discord_invite}" target="_blank" class="server-invite-btn">${translations[lang].server_required_msg_btn}</a>
                <p style="margin-top: 0.5rem; font-size: 0.9em;">${translations[lang].server_required_msg_desc}</p>
              </div>`;
        }

        async validateSession() {
            if (!this.sessionId) return false;
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, { headers: { 'X-Session-ID': this.sessionId } });
                if (response.status === 401) {
                    console.warn('Sessão expirada (401) no validateSession. Realizando logout...');
                    await this.logout();
                    return false;
                }
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success') {
                        this.userData = data.user;
                        this.updateUI();
                        return true;
                    }
                }
            } catch (error) { console.error('Erro ao validar sessão:', error); }
            return false;
        }

        async loadUserStats() {
            if (!this.sessionId) return;
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/auth/user-stats`, { headers: { 'X-Session-ID': this.sessionId } });
                if (response.status === 401) {
                    console.warn('Sessão expirada (401) no loadUserStats. Realizando logout...');
                    await this.logout();
                    return;
                }
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success') {
                        this.userStats = data.stats;
                        localStorage.setItem('crewbot_stats', JSON.stringify(this.userStats));
                        this.updateModal();
                    }
                }
            } catch (error) { console.error('Erro ao carregar estatísticas:', error); }
        }

        showUserModal() {
            if (elements.userProfileModal) {
                this.updateModal();
                elements.userProfileModal.style.display = 'block';
                if (appState.soundEnabled) playSound(600, 100, 'sine');
            }
        }

        hideUserModal() {
            if (elements.userProfileModal) elements.userProfileModal.style.display = 'none';
        }

        updateModal() {
            if (!this.userData || !this.userStats) return;

            const userId = this.userData.id || this.userData.userId;
            const avatarUrl = this.getAvatarUrl(userId, this.userData.avatar, 128);
            elements.modalUserAvatar.src = avatarUrl;
            elements.modalUserName.textContent = this.userData.global_name || this.userData.username;
            elements.modalUserDiscriminator.textContent = `@${this.userData.username}`;

            const lang = appState.currentLanguage;
            if (this.userStats.is_server_member) {
                elements.modalServerStatus.textContent = translations[lang].server_verified;
                elements.modalServerStatus.className = 'server-badge verified';
            } else {
                elements.modalServerStatus.textContent = translations[lang].server_missing;
                elements.modalServerStatus.className = 'server-badge missing';
            }

            elements.statKeysToday.textContent = this.userStats.keys_today;
            elements.statTotalKeys.textContent = this.userStats.keys_total;
            elements.statActiveKeys.textContent = this.userStats.keys_active;

            let memberText = 'N/A';
            if (this.userStats.member_since) {
                const memberSince = new Date(this.userStats.member_since);
                const now = new Date();
                const diffTime = now.getTime() - memberSince.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 1) memberText = translations[lang].member_since_now;
                else if (diffDays === 1) memberText = translations[lang].member_since_day;
                else memberText = translations[lang].member_since_days.replace('{days}', diffDays);
            }
            elements.statMemberSince.textContent = memberText;

            elements.modalGenerateBtn.disabled = !this.userStats.is_server_member;
        }

        async logout() {
            if (this.isLoggingOut) return; // Prevent recursive logout
            this.isLoggingOut = true;
            this.isAuthenticated = false; // Immediately mark as not authenticated

            if (this.sessionId) {
                try {
                    // Fire and forget logout to avoid blocking UI
                    fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ session_id: this.sessionId })
                    }).catch(e => console.warn('Logout request failed:', e));
                } catch (error) { console.error('Erro no logout:', error); }
            }

            ['crewbot_session', 'crewbot_user', 'crewbot_stats', 'crewbot_session_expires'].forEach(k => localStorage.removeItem(k));
            Object.assign(this, { sessionId: null, userData: null, userStats: null, isAuthenticated: false, sessionExpiresAt: 0 });

            this.updateUI();
            this.hideUserModal();
            showUIMessage(translations[appState.currentLanguage].logout_success, 'info');

            // Ensure we don't fetch keys after logout
            appState.userKeys = [];
            renderKeysList();
            updateKeyLimitDisplay();

            this.isLoggingOut = false;
        }

        getAvatarUrl(userId, avatarHash, size = 64) {
            if (!avatarHash) return `https://cdn.discordapp.com/embed/avatars/${(userId >> 22) % 6}.png`;
            return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=${size}`;
        }

        updateUI() {
            const isAuthenticated = this.isAuthenticated && this.userData;
            elements.authSection.style.display = isAuthenticated ? 'none' : 'block';
            elements.userContent.style.display = isAuthenticated ? 'block' : 'none';
            elements.userProfileHeader.style.display = isAuthenticated ? 'flex' : 'none';

            if (isAuthenticated) {
                const userId = this.userData.id || this.userData.userId;
                const avatarUrl = this.getAvatarUrl(userId, this.userData.avatar, 40);
                elements.userAvatarHeader.src = avatarUrl;
                elements.userNameHeader.textContent = this.userData.global_name || this.userData.username;
                elements.userDiscriminatorHeader.textContent = `@${this.userData.username}`;
                this.updateGenerateButton(this.userStats ? this.userStats.is_server_member : false);
            }
        }

        updateGenerateButton(isServerMember) {
            // Update all 3 method buttons
            if (elements.btnOpenMethodMenu) {
                const btn = elements.btnOpenMethodMenu;
                const lang = appState.currentLanguage; // Define lang here
                if (isServerMember && this.isAuthenticated) {
                    btn.disabled = false;
                    btn.title = 'Iniciar Task';
                } else {
                    btn.disabled = true;
                    if (!this.isAuthenticated) {
                        btn.title = 'Faça login com Discord para gerar keys';
                    } else {
                        btn.title = 'Entre no servidor Discord para gerar keys';
                    }
                }
            }
            // applyTranslation(lang); // This should not be here, it's called globally
        }

        getAuthHeaders() {
            return this.sessionId ? { 'X-Session-ID': this.sessionId } : {};
        }

        async refreshStats() {
            await this.loadUserStats();
            this.updateUI();
        }
    }

    const discordAuth = new DiscordAuthSystem();

    // sanitizeInput removido pois textContent já é seguro e isso causava escape duplo.

    // SEGURANÇA: Aceita Standard (19 chars) e Premium (P-XXXX-XXXX-XXXX-XXXX = 23 chars)
    function validateKey(key) { return typeof key === 'string' && /^[A-Z0-9P-]{19,23}$/.test(key); }
    function validateToken(token) { return typeof token === 'string' && /^[a-zA-Z0-9\-_]{20,}$/.test(token); }

    function initAudioContext() {
        if (!appState.audioContext && appState.soundEnabled) {
            try { appState.audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { console.error("Audio Context not supported"); }
        }
    }

    function playSound(frequency, duration = 100, type = 'sine') {
        if (!appState.soundEnabled || !appState.audioContext || frequency < 80 || frequency > 2000) return;
        try {
            const oscillator = appState.audioContext.createOscillator();
            const gainNode = appState.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(appState.audioContext.destination);
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            const now = appState.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000));
            oscillator.start(now);
            oscillator.stop(now + (duration / 1000));
        } catch (e) { console.error("Error playing sound", e); }
    }

    function playSoundSequence(sequence) {
        if (!appState.soundEnabled || !Array.isArray(sequence)) return;
        sequence.forEach((note, index) => {
            if (note && typeof note.freq === 'number') setTimeout(() => playSound(note.freq, note.duration, note.type), index * 150);
        });
    }

    function updateSoundToggle() {
        // elements.soundToggle.textContent = appState.soundEnabled ? '🔊' : '🔇';
        // elements.soundToggle.classList.toggle('active', appState.soundEnabled);
        localStorage.setItem('soundEnabled', appState.soundEnabled.toString());
    }

    function setButtonLoading(button, isLoading) {
        if (!button) return;
        button.classList.toggle('loading', isLoading);
        button.disabled = isLoading;
    }

    // setAllMethodsLoading removed as we now use the main button loading state or modal logic


    function showUIMessage(text, type = 'info', duration = 4500) {
        // Sanitiza texto para prevenir XSS
        const sanitizedText = text.replace(/[<>]/g, '').slice(0, 200);
        elements.messageEl.textContent = sanitizedText;
        elements.messageEl.className = `message visible ${type}`;
        // Announce to screen readers
        elements.messageEl.setAttribute('role', 'alert');
        elements.messageEl.setAttribute('aria-live', 'polite');
        if (elements.messageEl.timeoutId) clearTimeout(elements.messageEl.timeoutId);
        if (duration > 0) elements.messageEl.timeoutId = setTimeout(() => { elements.messageEl.className = 'message'; }, duration);
    }

    function updateKeyLimitDisplay() {
        const keysUsed = appState.userKeys.length;
        const lang = appState.currentLanguage;

        const limitText = translations[lang].key_limit_text
            .replace('{count}', keysUsed)
            .replace('{max}', CONFIG.MAX_KEY_LIMIT)
            .replace('{s}', keysUsed !== 1 ? 's' : '');
        elements.keyLimitText.textContent = limitText;
        elements.keyLimitHelper.textContent = translations[lang].key_limit_helper;

        elements.keyLimitInfo.className = 'key-limit-info';
        if (keysUsed >= CONFIG.MAX_KEY_LIMIT) elements.keyLimitInfo.classList.add('key-limit-full');
        else if (keysUsed >= CONFIG.MAX_KEY_LIMIT - 2) elements.keyLimitInfo.classList.add('key-limit-warning');

        elements.keyLimitSection.style.display = 'block';
    }

    function renderKeysList() {
        elements.keysListUl.innerHTML = '';
        if (appState.userKeys.length === 0) {
            const li = document.createElement('li');
            li.textContent = translations[appState.currentLanguage].no_records;
            li.className = 'no-keys';
            elements.keysListUl.appendChild(li);
            return;
        }
        appState.userKeys.forEach(key => {
            if (validateKey(key)) {
                const li = document.createElement('li');
                li.textContent = key;
                elements.keysListUl.appendChild(li);
            }
        });
    }

    function createConfetti(x, y) {
        const colors = ['#ffcb74', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: x / window.innerWidth, y: y / window.innerHeight },
            colors: colors,
            disableForReducedMotion: true
        });
    }

    function triggerConfetti() {
        const duration = 2000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ffcb74', '#e74c3c', '#3498db']
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ffcb74', '#e74c3c', '#3498db']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    function typeWriterEffect(text, element, speed = 40) {
        element.textContent = '';
        element.classList.add('typing-cursor');
        let i = 0;
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                // Randomize speed slightly for realism
                setTimeout(type, speed + Math.random() * 30);
            } else {
                element.classList.remove('typing-cursor');
            }
        }
        type();
    }

    function showAccessGranted() {
        const overlay = elements.accessGrantedOverlay;
        if (!overlay) return;
        overlay.classList.add('show');
        // Play a heavy "access granted" sound if enabled
        if (appState.soundEnabled) {
            playSoundSequence([
                { freq: 150, duration: 100, type: 'sawtooth' },
                { freq: 150, duration: 100, type: 'sawtooth' },
                { freq: 400, duration: 400, type: 'square' }
            ]);
        }
        setTimeout(() => {
            overlay.classList.remove('show');
        }, 2200);
    }

    async function copyToClipboard() {
        const keyValue = elements.keyValueEl.textContent?.trim();
        if (!keyValue || keyValue.includes('...') || keyValue.includes('AUTENTICANDO') || !validateKey(keyValue)) return;
        try {
            await navigator.clipboard.writeText(keyValue);
            const copyButtonSpan = elements.copyButton.querySelector('span');
            if (copyButtonSpan) copyButtonSpan.textContent = translations[appState.currentLanguage].copied_text;
            elements.copyButton.classList.add('copied');
            if (appState.soundEnabled) playSoundSequence([{ freq: 800, duration: 100, type: 'sine' }, { freq: 1000, duration: 150, type: 'sine' }]);

            const rect = elements.copyButton.getBoundingClientRect();
            createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

            setTimeout(() => {
                if (copyButtonSpan) copyButtonSpan.textContent = translations[appState.currentLanguage].copy_button;
                elements.copyButton.classList.remove('copied');
            }, 2000);
        } catch (err) {
            showUIMessage('❌ Erro ao copiar.', 'error');
            if (appState.soundEnabled) playSound(200, 200, 'sawtooth');
        }
    }

    function showAchievement(text) {
        if (!elements.achievementPopup) return;
        elements.achievementPopup.textContent = `🏆 ${text.slice(0, 100)}`;
        elements.achievementPopup.classList.add('show');
        setTimeout(() => {
            elements.achievementPopup.classList.remove('show');
        }, 3000);
    }

    function checkCooldownOnLoad() {
        const timeSince = Date.now() - appState.lastKeyGenerationTime;
        if (timeSince < CONFIG.COOLDOWN_DURATION && timeSince > 0) {
            const remaining = Math.ceil((CONFIG.COOLDOWN_DURATION - timeSince) / 1000);
            if (remaining > 0) startCooldown(remaining);
        }
    }

    function startCooldown(seconds = 30) {
        if (appState.cooldownTimer) clearInterval(appState.cooldownTimer);
        appState.isInCooldown = true;
        elements.cooldownSection.style.display = 'block';
        if (elements.btnOpenMethodMenu) elements.btnOpenMethodMenu.disabled = true;

        let remaining = Math.max(0, seconds);
        elements.cooldownTime.textContent = `${remaining}s`;

        appState.cooldownTimer = setInterval(() => {
            remaining--;
            elements.cooldownTime.textContent = `${remaining}s`;
            if (remaining <= 0) {
                clearInterval(appState.cooldownTimer);
                appState.isInCooldown = false;
                elements.cooldownSection.style.display = 'none';
                if (elements.btnOpenMethodMenu) elements.btnOpenMethodMenu.disabled = false;
                if (appState.soundEnabled) playSoundSequence([{ freq: 440, duration: 100, type: 'sine' }, { freq: 554, duration: 100, type: 'sine' }, { freq: 659, duration: 200, type: 'sine' }]);
                showUIMessage(translations[appState.currentLanguage].system_ready, 'success');
            }
        }, 1000);
    }

    async function generateNewKey() {
        if (appState.isProcessing) return;
        appState.isProcessing = true;

        try {
            initAudioContext();
            if (appState.soundEnabled) playSoundSequence([{ freq: 800, duration: 100, type: 'square' }, { freq: 600, duration: 100, type: 'square' }, { freq: 400, duration: 150, type: 'square' }]);

            setButtonLoading(elements.btnOpenMethodMenu, true);
            elements.keyContainerEl.classList.remove('visible');
            elements.keyActions.style.display = 'none';
            elements.keyMetadata.style.display = 'none';
            elements.keyValueEl.textContent = translations[appState.currentLanguage].processing_auth;
            elements.keyValueEl.classList.add('processing');

            const verificationToken = localStorage.getItem(CONFIG.BACKEND_VERIFICATION_TOKEN_KEY);
            if (!verificationToken || !validateToken(verificationToken)) {
                throw new Error('Falha na verificação de segurança.');
            }

            showUIMessage(translations[appState.currentLanguage].connecting_server, 'info', 0);
            const headers = { 'X-Verification-Token': verificationToken, ...discordAuth.getAuthHeaders() };
            const response = await fetch(`${CONFIG.API_BASE_URL}/generate_key`, { method: 'GET', headers });

            if (response.status === 401) {
                showUIMessage('Sessão expirada. Faça login novamente.', 'error');
                await discordAuth.logout();
                return;
            }

            const data = await response.json();

            elements.keyValueEl.classList.remove('processing');
            localStorage.removeItem(CONFIG.BACKEND_VERIFICATION_TOKEN_KEY);

            if (response.ok && data.status === 'success' && validateKey(data.key)) {
                // Visual Dopamine Sequence
                showAccessGranted();
                triggerConfetti();

                elements.keyContainerEl.classList.add('visible');
                elements.keyContainerEl.classList.add('pop-in');

                // Delay showing the key slightly to sync with overlay fade
                setTimeout(() => {
                    typeWriterEffect(data.key, elements.keyValueEl);
                }, 800);

                elements.keyActions.style.display = 'flex';
                elements.keyMetadata.style.display = 'block';
                elements.keyTimestamp.textContent = new Date().toLocaleString('pt-BR');
                
                // Adiciona animação de pulso ao botão de copiar para chamar atenção
                if (elements.copyButton) {
                    elements.copyButton.classList.add('pulse-hint');
                    setTimeout(() => elements.copyButton.classList.remove('pulse-hint'), 4500);
                }

                appState.keyGenerationCount++;
                appState.lastKeyGenerationTime = Date.now();
                localStorage.setItem('keyGenerationCount', appState.keyGenerationCount.toString());
                localStorage.setItem('lastKeyGenerationTime', appState.lastKeyGenerationTime.toString());

                if (appState.soundEnabled) playSoundSequence([{ freq: 523, duration: 150, type: 'sine' }, { freq: 659, duration: 150, type: 'sine' }, { freq: 784, duration: 200, type: 'sine' }, { freq: 1047, duration: 250, type: 'sine' }]);
                showUIMessage(translations[appState.currentLanguage].key_valid, 'success');

                if (appState.keyGenerationCount === 1) showAchievement(translations[appState.currentLanguage].first_access);
                else if (appState.keyGenerationCount === 5) showAchievement(translations[appState.currentLanguage].veteran_crewmate);
                else if (appState.keyGenerationCount === 10) showAchievement(translations[appState.currentLanguage].security_expert);

                await fetchUserKeyList();
                await discordAuth.refreshStats();
                startCooldown(CONFIG.COOLDOWN_DURATION / 1000);
            } else {
                const errorMessage = data?.message || 'ERRO: Solicitação Negada.';

                // Se for erro de "muito rápido" (400) ou rate limit (429), tenta novamente após um delay curto
                if (response.status === 400 && errorMessage.includes('rápida')) {
                    showUIMessage('Verificando segurança... aguarde.', 'info', 2000);
                    setTimeout(() => generateNewKey(), 2500); // Tenta de novo em 2.5s
                    return;
                }

                if (response.status === 429) startCooldown(60);
                showUIMessage(errorMessage, 'error');
                if (appState.soundEnabled) playSound(200, 500, 'sawtooth');
            }
        } catch (error) {
            elements.keyValueEl.classList.remove('processing');
            localStorage.removeItem(CONFIG.BACKEND_VERIFICATION_TOKEN_KEY);
            showUIMessage(translations[appState.currentLanguage].emergency_error.replace('{error}', error.message), 'error');
            if (appState.soundEnabled) playSound(150, 800, 'sawtooth');
        } finally {
            // setAllMethodsLoading(false); // This was removed, so we need to ensure btnOpenMethodMenu is handled
            setButtonLoading(elements.btnOpenMethodMenu, false);
            appState.isProcessing = false;
        }
    }

    async function fetchUserKeyList() {
        // Don't fetch if not authenticated or if logging out
        if (!discordAuth.isAuthenticated || !discordAuth.sessionId || discordAuth.isLoggingOut) {
            console.log('[fetchUserKeyList] User not authenticated or logging out, skipping');
            return;
        }

        try {
            setButtonLoading(elements.btnView, true);
            showUIMessage(translations[appState.currentLanguage].consulting_log, 'info', 0);
            const headers = discordAuth.getAuthHeaders();
            const response = await fetch(`${CONFIG.API_BASE_URL}/user_keys`, { headers });

            if (response.status === 401) {
                console.warn('Sessão expirada (401) no fetchUserKeyList. Realizando logout...');
                await discordAuth.logout();
                return;
            }

            const data = await response.json();
            if (response.ok && data.status === 'success') {
                appState.userKeys = data.keys || [];
                renderKeysList();
                updateKeyLimitDisplay();
                showUIMessage(appState.userKeys.length > 0 ? translations[appState.currentLanguage].log_loaded : translations[appState.currentLanguage].no_id_found, 'info', 3000);
            } else {
                throw new Error(data.message || `FALHA ${response.status}.`);
            }
        } catch (error) {
            showUIMessage(`❌ ${error.message}`, 'error');
        } finally {
            setButtonLoading(elements.btnView, false);
        }
    }

    async function initiateShortenerRedirect(methodIndex = 1) {
        // Check if any button is disabled (cooldown or processing)
        if (appState.isInCooldown || appState.isProcessing) {
            showUIMessage(translations[appState.currentLanguage].wait_cooldown, 'error');
            if (appState.soundEnabled) playSound(200, 300, 'sawtooth');
            return;
        }
        if (appState.userKeys.length >= CONFIG.MAX_KEY_LIMIT) {
            showUIMessage(translations[appState.currentLanguage].limit_reached, 'error');
            if (appState.soundEnabled) playSound(200, 500, 'sawtooth');
            return;
        }
        appState.isProcessing = true;
        try {
            if (appState.soundEnabled) playSound(600, 100, 'square');
            showUIMessage(translations[appState.currentLanguage].starting_verification, 'info', 0);

            if (!appState.turnstileToken) {
                showUIMessage('Por favor, complete o captcha primeiro.', 'error');
                appState.isProcessing = false;
                // Re-open modal for user to complete captcha
                if (elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'block';
                return;
            }

            // Check token age before sending
            const tokenAge = Date.now() - (appState.turnstileVerifiedAt || 0);
            if (tokenAge > 4 * 60 * 1000) {
                showUIMessage('Verificação expirada. Complete o captcha novamente.', 'error');
                appState.turnstileToken = null;
                appState.isProcessing = false;
                disableMethodButtons();
                if (window.turnstile) {
                    const widget = document.querySelector('.cf-turnstile');
                    if (widget) window.turnstile.reset(widget);
                }
                if (elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'block';
                return;
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}/initiate-verification`, {
                method: 'GET',
                headers: {
                    'X-Turnstile-Token': appState.turnstileToken
                }
            });
            const data = await response.json();
            
            // Handle Turnstile rejection from backend
            if (response.status === 403 && data.message?.includes('Captcha')) {
                showUIMessage('Verificação falhou. Tente novamente.', 'error');
                appState.turnstileToken = null;
                disableMethodButtons();
                if (window.turnstile) {
                    const widget = document.querySelector('.cf-turnstile');
                    if (widget) window.turnstile.reset(widget);
                }
                appState.isProcessing = false;
                if (elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'block';
                return;
            }
            
            if (response.ok && data.status === 'success' && validateToken(data.verification_token)) {
                localStorage.setItem(CONFIG.BACKEND_VERIFICATION_TOKEN_KEY, data.verification_token);
                showUIMessage(translations[appState.currentLanguage].redirecting_portal, 'info', 5000);

                // Select the correct URL based on method
                let targetUrl = CONFIG.SHORTENER_URLS[methodIndex] || CONFIG.SHORTENER_URLS[1];

                // Append method parameter just in case (optional, but good for tracking)
                const urlObj = new URL(targetUrl);
                urlObj.searchParams.append('method', methodIndex);

                setTimeout(() => { window.location.href = urlObj.toString(); }, 1500);
            } else {
                throw new Error(data.message || translations[appState.currentLanguage].unknown_error);
            }
        } catch (error) {
            showUIMessage(`❌ Falha ao iniciar: ${error.message}`, 'error');
            setButtonLoading(elements.btnOpenMethodMenu, false);
            appState.isProcessing = false;
        }
    }

    function checkAndProcessShortenerReturn() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            const status = urlParams.get('status');
            const backendToken = localStorage.getItem(CONFIG.BACKEND_VERIFICATION_TOKEN_KEY);

            if (!backendToken) return;

            // Check if any of the valid return configurations match
            let isValidReturn = false;
            let methodUsed = 0;

            if (action === CONFIG.RETURN_CONFIG[1].action && status === CONFIG.RETURN_CONFIG[1].status) { isValidReturn = true; methodUsed = 1; }
            else if (action === CONFIG.RETURN_CONFIG[2].action && status === CONFIG.RETURN_CONFIG[2].status) { isValidReturn = true; methodUsed = 2; }
            else if (action === CONFIG.RETURN_CONFIG[3].action && status === CONFIG.RETURN_CONFIG[3].status) { isValidReturn = true; methodUsed = 3; }

            if (isValidReturn) {
                showUIMessage(translations[appState.currentLanguage].verification_complete, 'success');
                window.history.replaceState({}, document.title, window.location.pathname);
                generateNewKey();
            } else {
                // Only clear if it looks like a return attempt but failed (optional, or just leave it for manual retry)
                // localStorage.removeItem(CONFIG.BACKEND_VERIFICATION_TOKEN_KEY); 
            }
        } catch (e) { /* Ignore errors */ }
    }

    function openDiscordWidget() {
        elements.discordWidgetContainer.classList.add('active');
        elements.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (appState.soundEnabled) playSoundSequence([{ freq: 523, duration: 100, type: 'sine' }, { freq: 659, duration: 100, type: 'sine' }]);
    }

    function closeDiscordWidget() {
        elements.discordWidgetContainer.classList.remove('active');
        elements.overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        if (appState.soundEnabled) playSound(400, 100, 'sine');
    }

    function applyTranslation(lang) {
        if (!translations[lang]) return;
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.getAttribute('data-translate-key');
            if (translations[lang][key]) {
                el.textContent = translations[lang][key];
                // Atualiza também o data-text para efeitos de glitch/css
                if (el.hasAttribute('data-text')) {
                    el.setAttribute('data-text', translations[lang][key]);
                }
            }
        });
        document.querySelectorAll('[data-translate-title]').forEach(el => {
            const key = el.getAttribute('data-translate-title');
            if (translations[lang][key]) {
                el.title = translations[lang][key];
            }
        });
        document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
        appState.currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);

        discordAuth.updateModal();
        renderKeysList();
        if (discordAuth.isAuthenticated) discordAuth.updateGenerateButton(discordAuth.userStats ? discordAuth.userStats.is_server_member : false);
        if (discordAuth.isAuthenticated) updateKeyLimitDisplay();
    }

    function toggleTranslation() {
        const newLang = appState.currentLanguage === 'pt' ? 'en' : 'pt';
        applyTranslation(newLang);
    }

    function setupCanvasStarfield() {
        const canvas = elements.starfieldCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let stars = [];
        const numStars = Math.min(250, Math.floor((window.innerWidth * window.innerHeight) / 8000));

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            stars = [];
            for (let i = 0; i < numStars; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5,
                    alpha: Math.random() * 0.5 + 0.5,
                    dx: (Math.random() - 0.5) * 0.1,
                    dy: (Math.random() - 0.5) * 0.1,
                    alphaChange: (Math.random() - 0.5) * 0.01
                });
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(star => {
                star.x += star.dx;
                star.y += star.dy;
                star.alpha += star.alphaChange;
                if (star.alpha <= 0.1 || star.alpha >= 1) star.alphaChange *= -1;
                if (star.x < 0) star.x = canvas.width;
                if (star.x > canvas.width) star.x = 0;
                if (star.y < 0) star.y = canvas.height;
                if (star.y > canvas.height) star.y = 0;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
                ctx.fill();
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();
    }

    function setupEventListeners() {
        // Initialize AudioContext on first user interaction to comply with browser policies
        const initAudio = () => {
            initAudioContext();
            if (appState.audioContext && appState.audioContext.state === 'suspended') {
                appState.audioContext.resume();
            }
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };
        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);

        if (elements.copyButton) elements.copyButton.addEventListener('click', copyToClipboard);
        // Permitir clicar diretamente na key para copiar
        if (elements.keyValueEl) {
            elements.keyValueEl.style.cursor = 'pointer';
            elements.keyValueEl.addEventListener('click', copyToClipboard);
        }

        // Method Menu Logic
        if (elements.btnOpenMethodMenu) {
            elements.btnOpenMethodMenu.addEventListener('click', () => {
                if (elements.methodSelectionModal) {
                    elements.methodSelectionModal.style.display = 'block';
                    
                    // Check if Turnstile token is still valid (< 4 minutes old)
                    const tokenAge = Date.now() - (appState.turnstileVerifiedAt || 0);
                    const TOKEN_MAX_AGE = 4 * 60 * 1000; // 4 minutes
                    
                    if (appState.turnstileToken && tokenAge < TOKEN_MAX_AGE) {
                        // Token still valid, enable buttons
                        console.log('[Modal] Turnstile token still valid, enabling buttons');
                        enableMethodButtons();
                    } else if (appState.turnstileToken && tokenAge >= TOKEN_MAX_AGE) {
                        // Token expired, reset
                        console.log('[Modal] Turnstile token expired, resetting');
                        appState.turnstileToken = null;
                        disableMethodButtons();
                        if (window.turnstile) {
                            const widget = document.querySelector('.cf-turnstile');
                            if (widget) window.turnstile.reset(widget);
                        }
                    }
                    // If no token, Turnstile will handle it automatically
                }
            });
        }
        if (elements.closeMethodModal) {
            elements.closeMethodModal.addEventListener('click', () => {
                if (elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'none';
            });
        }
        if (elements.methodSelectionModal) {
            window.addEventListener('click', (e) => {
                if (e.target === elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'none';
            });
        }

        // Method Buttons in Modal
        if (elements.btnMethod1) elements.btnMethod1.addEventListener('click', () => { if (elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'none'; initiateShortenerRedirect(1); });
        if (elements.btnMethod2) elements.btnMethod2.addEventListener('click', () => { if (elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'none'; initiateShortenerRedirect(2); });
        if (elements.btnMethod3) elements.btnMethod3.addEventListener('click', () => { if (elements.methodSelectionModal) elements.methodSelectionModal.style.display = 'none'; initiateShortenerRedirect(3); });
        if (elements.btnView) elements.btnView.addEventListener('click', () => { if (appState.soundEnabled) playSound(500, 100, 'square'); fetchUserKeyList(); });
        if (elements.translateButton) elements.translateButton.addEventListener('click', toggleTranslation);
        if (elements.supportButton) elements.supportButton.addEventListener('click', openDiscordWidget);
        const downloadModBtn = document.getElementById('downloadModBtn');
        if (downloadModBtn) {
            downloadModBtn.addEventListener('click', () => {
                if (appState.soundEnabled) playSoundSequence([{ freq: 600, duration: 100, type: 'sine' }, { freq: 800, duration: 150, type: 'sine' }]);
            });
        }
        if (elements.closeWidget) elements.closeWidget.addEventListener('click', closeDiscordWidget);
        if (elements.overlay) elements.overlay.addEventListener('click', closeDiscordWidget);
        if (elements.discordWidgetContainer) {
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && elements.discordWidgetContainer.classList.contains('active')) closeDiscordWidget(); });
        }
        window.addEventListener('beforeunload', () => { if (appState.cooldownTimer) clearInterval(appState.cooldownTimer); });
    }

    function setupSessionWatcher() {
        const checkSession = async () => {
            if (discordAuth.isAuthenticated && discordAuth.isSessionExpired()) {
                console.log('Sessão expirada, fazendo logout...');
                await discordAuth.logout();
            }
        };

        // Check every minute
        setInterval(checkSession, 60000);

        // Check immediately when user returns to tab
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkSession();
        });
        window.addEventListener('focus', checkSession);
    }

    function initializeApp() {
        appState.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        appState.keyGenerationCount = parseInt(localStorage.getItem('keyGenerationCount') || '0');
        appState.lastKeyGenerationTime = parseInt(localStorage.getItem('lastKeyGenerationTime') || '0');
        
        // Sistema de detecção de idioma automático
        const preferredLang = localStorage.getItem('preferredLanguage');
        let targetLang;
        
        if (preferredLang && translations[preferredLang]) {
            // Usuário já escolheu um idioma antes
            targetLang = preferredLang;
        } else {
            // Detecta idioma do navegador
            const browserLang = navigator.language || navigator.userLanguage;
            // Se for português (pt, pt-BR, pt-PT), usa PT. Caso contrário, usa EN
            targetLang = browserLang.toLowerCase().startsWith('pt') ? 'pt' : 'en';
            console.log(`[i18n] Browser language: ${browserLang} → Using: ${targetLang.toUpperCase()}`);
        }
        
        // Aplica tradução (mesmo se for PT, para garantir consistência)
        applyTranslation(targetLang);
    }

    initializeApp();
    updateSoundToggle();
    setupCanvasStarfield();
    setupEventListeners();
    discordAuth.init().then(() => {
        checkAndProcessShortenerReturn();
        if (discordAuth.isAuthenticated) {
            checkCooldownOnLoad();
        }
    });
    setupSessionWatcher();

    setTimeout(() => {
        if (appState.soundEnabled) {
            playSoundSequence([{ freq: 220, duration: 100, type: 'sine' }, { freq: 277, duration: 100, type: 'sine' }, { freq: 330, duration: 100, type: 'sine' }, { freq: 440, duration: 200, type: 'sine' }]);
        }
    }, 1000);
});
