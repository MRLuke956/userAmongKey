// ============================================
// TURNSTILE CALLBACKS - DEVEM ESTAR NO ESCOPO GLOBAL ANTES DO DOM CARREGAR
// ============================================
window._turnstileToken = null;
window._turnstileVerifiedAt = null;
window._turnstileReady = false;

window.onTurnstileSuccess = function (token) {
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

window.onTurnstileError = function () {
    console.error('[Turnstile] ❌ Verification failed');
    window._turnstileToken = null;
    // UX: Use toast instead of blocking alert
    const msg = document.getElementById('message');
    if (msg) {
        msg.textContent = '❌ Erro na verificação Cloudflare. Recarregue a página.';
        msg.className = 'message visible show error';
        msg.setAttribute('role', 'alert');
    }
};

window.onTurnstileExpired = function () {
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
// TOAST NOTIFICATION SYSTEM
// ============================================
class ToastManager {
    constructor() {
        this.container = null;
        this.queue = [];
        this.maxVisible = 3;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._createContainer());
        } else {
            this._createContainer();
        }
    }

    _createContainer() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'status');
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(this.container);
    }

    _getIcon(type) {
        const icons = {
            success: '#icon-checkmark',
            error: '#icon-x-mark',
            info: '#icon-crewmate-standing',
            warning: '#icon-emergency-button'
        };
        return icons[type] || icons.info;
    }

    _getTitle(type) {
        const titles = {
            success: 'Task Complete',
            error: 'Impostor Alert',
            info: 'Comms Update',
            warning: 'Warning'
        };
        return titles[type] || 'Info';
    }

    show(message, type = 'info', duration = 4500) {
        if (!this.container) this._createContainer();
        if (!message) return;

        const sanitized = String(message).replace(/[<>]/g, '').slice(0, 250);

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-icon">
                <svg class="icon" width="20" height="20"><use href="${this._getIcon(type)}"/></svg>
            </div>
            <div class="toast-body">
                <div class="toast-title">${this._getTitle(type)}</div>
                <div class="toast-message">${sanitized}</div>
            </div>
            <button class="toast-close" aria-label="Dismiss">&times;</button>
            ${duration > 0 ? `<div class="toast-progress" style="width:100%;transition-duration:${duration}ms;"></div>` : ''}
        `;

        toast.querySelector('.toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this._dismiss(toast);
        });
        toast.addEventListener('click', () => this._dismiss(toast));

        this.container.appendChild(toast);

        // Trim excess toasts
        const visible = this.container.querySelectorAll('.toast:not(.toast-exiting)');
        if (visible.length > this.maxVisible) {
            this._dismiss(visible[0]);
        }

        // Trigger entrance
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
            // Start progress bar
            const progress = toast.querySelector('.toast-progress');
            if (progress) {
                requestAnimationFrame(() => { progress.style.width = '0%'; });
            }
        });

        // Auto-dismiss
        if (duration > 0) {
            toast._timeout = setTimeout(() => this._dismiss(toast), duration);
        }

        // Announce to screen readers
        const srEl = document.getElementById('srAnnouncements');
        if (srEl) srEl.textContent = sanitized;

        return toast;
    }

    _dismiss(toast) {
        if (!toast || toast._dismissed) return;
        toast._dismissed = true;
        if (toast._timeout) clearTimeout(toast._timeout);
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-exiting');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 350);
    }

    clearAll() {
        if (!this.container) return;
        this.container.querySelectorAll('.toast').forEach(t => this._dismiss(t));
    }
}

// Global toast instance
const toast = new ToastManager();

// ============================================
// SVG ICON HELPER
// ============================================
function svgIcon(name, size = 16, extraClass = '') {
    return `<svg class="icon ${extraClass}" width="${size}" height="${size}"><use href="#icon-${name}"/></svg>`;
}

// ============================================
// RIPPLE EFFECT
// ============================================
function addRipple(e) {
    const btn = e.currentTarget;
    if (!btn || btn.disabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    btn.appendChild(ripple);
    setTimeout(() => { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 650);
}

// ============================================
// SCROLL REVEAL (Intersection Observer)
// ============================================
function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

// ============================================
// MAIN APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        // URL da API já definida para produção
        API_BASE_URL: 'https://api.crewcore.online',
        REQUEST_TIMEOUT: 15000, // 15 segundos timeout para requests
        // === SISTEMA DE 2 PASSOS (2026) ===
        SHORTENER_URLS: {
            step1: 'https://link-target.net/63830/among-us-modmenu-key1',  // Linkvertise
            step2: 'https://link-hub.net/63830/tQtGDD3vTskf'              // DirectLink
        },
        MAX_KEY_LIMIT: 5,
        COOLDOWN_DURATION: 30000,
        SESSION_DURATION_MS: 24 * 60 * 60 * 1000, // 24 horas em ms
        // === ANTI-BYPASS: Storage keys ===
        TWOSTEP_SESSION_KEY: 'crewTwoStepSession',       // session_id atual
        TWOSTEP_STEP1_TOKEN_KEY: 'crewStep1Token',       // token após step1
        TWOSTEP_CURRENT_STEP_KEY: 'crewCurrentStep',     // 1 ou 2
        BYPASS_PROOF_TOKEN_KEY: 'miraHqProofToken',      // proof_token após challenge
        BYPASS_STARTED_AT_KEY: 'miraHqBypassStartedAt',  // timestamp de início
        // Configuração dos Retornos (suporta múltiplos formatos de URL)
        RETURN_CONFIG: {
            step1: { action: 'complete_step1', alternativeActions: ['complete_m1', 'step1_complete'], status: 'success' },
            step2: { action: 'complete_step2', alternativeActions: ['complete_m2', 'complete_m3', 'step2_complete'], status: 'success' }
        }
    };

    const elements = {
        btnOpenMethodMenu: document.getElementById('btnOpenMethodMenu'),
        // === Two-Step Modal Elements (2026) ===
        twoStepModal: document.getElementById('twoStepModal'),
        closeTwoStepModal: document.getElementById('closeTwoStepModal'),
        stepCard1: document.getElementById('stepCard1'),
        stepCard2: document.getElementById('stepCard2'),
        btnStep1: document.getElementById('btnStep1'),
        btnStep2: document.getElementById('btnStep2'),
        step1Status: document.getElementById('step1Status'),
        step2Status: document.getElementById('step2Status'),
        step2LockedOverlay: document.getElementById('step2LockedOverlay'),
        stepIndicator1: document.getElementById('stepIndicator1'),
        stepIndicator2: document.getElementById('stepIndicator2'),
        twoStepTurnstile: document.getElementById('twoStepTurnstile'),
        twoStepTurnstileHint: document.getElementById('twoStepTurnstileHint'),
        // === Standard Elements ===
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
        missionGreeting: document.getElementById('missionGreeting'),
        missionAuthChip: document.getElementById('missionAuthChip'),
        missionServerChip: document.getElementById('missionServerChip'),
        missionPremiumChip: document.getElementById('missionPremiumChip'),
        missionCtaBtn: document.getElementById('missionCtaBtn'),
        helpButton: document.getElementById('helpButton'),
        tutorialModal: document.getElementById('tutorialModal'),
        closeTutorialModal: document.getElementById('closeTutorialModal'),
        accessGrantedOverlay: document.getElementById('accessGrantedOverlay'),
        // === Challenge Modal Elements ===
        challengeModal: document.getElementById('challengeModal'),
        challengeQuestion: document.getElementById('challengeQuestion'),
        challengeOptions: document.getElementById('challengeOptions'),
        challengeTimer: document.getElementById('challengeTimer'),
        challengeAttempts: document.getElementById('challengeAttempts'),
        closeChallengeModal: document.getElementById('closeChallengeModal')
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
        turnstileVerifiedAt: window._turnstileVerifiedAt || null,
        // === TWO-STEP STATE (2026) ===
        currentStep: 0,                    // 0 = not started, 1 = step1, 2 = step2
        step1Token: null,                  // Token received after completing step1
        step2SessionId: null,              // Session ID for step2
        twoStepSessionId: null,            // Current session ID
        // === CHALLENGE STATE ===
        currentChallenge: null,
        challengeTimerInterval: null,
        proofToken: null
    };

    const sleepMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.REQUEST_TIMEOUT, retries = 0) {
        let attempt = 0;

        while (true) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeoutId);

                const retriableStatus = response.status === 408 || response.status === 429 || response.status >= 500;
                if (attempt < retries && retriableStatus) {
                    attempt++;
                    await sleepMs(Math.min(1200 * attempt, 3000));
                    continue;
                }

                return response;
            } catch (error) {
                clearTimeout(timeoutId);

                const retriableError = error && (error.name === 'AbortError' || error.name === 'TypeError');
                if (attempt < retries && retriableError) {
                    attempt++;
                    await sleepMs(Math.min(1200 * attempt, 3000));
                    continue;
                }

                throw error;
            }
        }
    }

    // Sincroniza o token global com o appState
    window._syncTurnstileState = function (token) {
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
            key_limit_text: 'You have {count} active ID(s) (maximum: {max} active per account)',
            key_limit_helper: '💡 Max 5 active keys at a time. Use or delete one to generate more — unlimited!',
            generate_button: '🚀 START TASK',
            generate_button_hint: 'Generate your mod key here',
            key_empty_state: 'Click START TASK to generate your key',
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
            limit_reached: '⚠️ LIMIT: 5 active keys. Use or delete one to generate more!',
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
            download_badge: '📡 DOWNLOAD STATION',
            download_title: 'ModMenuCrew',
            version_latest: '✅ Latest version',
            download_hint: '🔒 Secure download via Cloudflare',
            download_client_title: 'Download Mod',
            download_client_subtitle: 'Mod V6.0.6d • Game v17.1.0',
            download_now: 'DOWNLOAD NOW',
            platform_steam: 'Steam',
            platform_epic: 'Epic Games',
            turnstile_hint: 'Complete the verification above to unlock the methods',
            turnstile_success: '✅ Verified! Select a method below',
            // === DOWNLOAD TURNSTILE ===
            download_turnstile_hint: '🔒 Complete the verification to unlock download',
            download_turnstile_success: '✅ Verified! Select platform below',
            dl_chip_instant: 'Instant Activation',
            dl_chip_undetected: 'Undetected',
            dl_chip_easy: 'Easy to Use',
            dl_verify_label: 'Verification required for download',
            dl_trust_cf: 'Via Cloudflare R2',
            dl_trust_scan: 'Daily scan',
            dl_trust_update: 'Updated today',
            download_turnstile_error: '❌ Verification failed. Try reloading the page.',
            download_turnstile_expired: '⚠️ Verification expired. Complete again.',
            download_turnstile_required: '🔒 Complete Cloudflare verification first!',
            // === ANTI-BYPASS CHALLENGE ===
            challenge_title: '🔐 Security Verification',
            challenge_subtitle: 'Complete the challenge to prove you are human',
            challenge_timeout: 'Time remaining:',
            challenge_attempts: 'Attempts:',
            challenge_solving: 'Verifying answer...',
            challenge_success: '✅ Challenge completed!',
            challenge_wrong: '❌ Oops! Wrong answer. Try again.',
            challenge_expired: '⏰ Time expired. No problem, start over!',
            challenge_blocked: '🚫 Bypass attempt detected! Wait 1 minute.',
            challenge_bypass_detected: '⚠️ Bypass detected! You must complete the shortener correctly.',
            verification_processing: '⏳ Processing return...',
            challenge_hint: '⚠️ Complete to receive your key',
            // === PREMIUM ===
            premium_title: 'Skip verification',
            plan_popular: 'POPULAR',
            plan_best: 'BEST VALUE',
            plan_48h_name: '48 Hours',
            plan_monthly_name: '30 Days',
            feature_no_verification: 'No verification',
            feature_unlimited: 'Unlimited uses',
            feature_instant: 'Instant activation',
            feature_priority: 'Priority support',
            feature_updates: 'Early access',
            buy_now: 'Buy',
            secure_payment: 'Secure payment via Stripe',
            premium_active_title: '⭐ PREMIUM ACTIVE',
            premium_active_text: 'You have active {type} access!',
            premium_active_sub: 'Your key is unique and can be used unlimited times until it expires.',
            premium_keys_title: '⭐ Your Premium Keys',
            // Plan Details (hover)
            detail_no_verification: '✓ No verification',
            detail_unlimited_keys: '✓ Unlimited uses',
            detail_expires_48h: '⏱️ Expires in 48 hours',
            detail_7days_access: '⏱️ 7 days of access',
            detail_30days_access: '⏱️ 30 days of access',
            detail_90days_access: '⏱️ 90 days of access',
            detail_1year_access: '⏱️ 1 full year',
            detail_never_expires: '♾️ NEVER expires',
            detail_auto_renew: '🔄 Auto-renews',
            detail_renew_3months: '🔄 Renews every 3 months',
            detail_renew_yearly: '🔄 Renews annually',
            detail_priority_support: '⚡ Priority support',
            detail_vip_support: '⚡ VIP support',
            detail_pay_once: '🎁 Pay once only',
            detail_save_28: '💰 28% savings',
            detail_save_20: '💰 20% savings',
            detail_save_50: '💰 50% savings',
            // Premium Comparison & Social Proof
            prem_title: 'Stop suffering with links',
            prem_subtitle: 'Play without interruptions, with exclusive features',
            prem_free_label: 'Free',
            prem_premium_label: 'Premium',
            prem_free_1: '2 shortener links per key',
            prem_free_2: 'Expires when game closes',
            prem_free_3: 'Max 5 active keys at once',
            prem_free_4: 'No exclusive features',
            prem_pro_1: 'Instant key, zero links',
            prem_pro_2: 'Active until plan expires',
            prem_pro_3: 'Unlimited usage',
            prem_pro_4: '🎨 Same color for all',
            prem_pro_5: '🐍 Always Viper / Phantom',
            prem_social_proof: '<strong id="premiumActiveCount">--</strong> players use Premium now',
            prem_most_popular: '⭐ MOST POPULAR',
            prem_best_value: '🏆 BEST VALUE',
            prem_try: 'Try it',
            prem_card_instant: '⚡ Instant key',
            prem_card_nolinks: '🚫 Zero links',
            prem_card_allfeatures: '✨ All features',
            prem_card_colors: '🎨 Same color for all',
            prem_card_roles: '🐍 Always Viper/Phantom',
            prem_per_day_30: '~$0.15/day',
            prem_per_day_90: '~$0.12/day',
            prem_cancel: 'Cancel anytime',
            // Plan Names
            plan_48h: '48h',
            plan_7days: '7 Days',
            plan_30days: '30 Days',
            plan_90days: '90 Days',
            plan_365days: '365 Days',
            plan_lifetime: 'Lifetime',
            plan_forever: 'Forever!',
            plan_per_month: '~$2.50/month',
            verifying_payment: 'Verifying payment...',
            // Elite Network
            premium_badge: '⚡ ELITE ACCESS',
            net_online: 'online now',
            net_keys_today: 'keys today',
            net_members: 'on Discord',
            net_uptime: 'hrs uptime',
            net_uptime_percent: 'uptime',
            // Premium Success Modal
            premium_payment_confirmed: 'Payment Confirmed!',
            premium_key_ready: 'Your Premium key is ready!',
            premium_your_key: '⭐ YOUR PREMIUM KEY',
            premium_copy_key: '📋 COPY KEY',
            premium_how_to_use: '📖 How to use:',
            premium_step_1: 'Open Among Us with the mod installed',
            premium_step_2: 'Press <strong>F1</strong> in the main menu',
            premium_step_3: 'Paste the key in the activation field',
            premium_step_4: 'Enjoy Premium access for 48h! 🚀',
            // === PREMIUM USER PANEL ===
            premium_panel_badge: '👑 PREMIUM ACTIVE',
            premium_panel_title: 'Manage Premium Key',
            premium_label_key: '🔑 Key:',
            premium_label_plan: '📦 Plan:',
            premium_label_expires: '⏱️ Expires:',
            premium_hwid_bound: 'Bound',
            premium_hwid_unbound: 'Not bound',
            premium_reset_hwid: 'Reset HWID',
            premium_reset_cooldown: '1x per day',
            premium_panel_hint: 'Use reset to switch devices. Available 1x every 24h.',
            premium_available_in: 'Available in {hours}h',
            // Delete Key
            delete_key_button: '🗑️',
            delete_key_confirm: 'Are you sure you want to delete this key?',
            delete_key_deleting: '🗑️ Deleting...',
            delete_key_success: '✅ Key deleted successfully!',
            delete_key_error: '❌ Error deleting key',
            session_expired: 'Session expired. Please login again.',
            captcha_first: 'Complete the captcha first.',
            captcha_expired: 'Captcha expired. Complete again.',
            step1_done: '✅ Step 1 complete! Step 2 unlocked.',
            security_checking: 'Checking security... please wait.',
            session_expired_login: 'Session expired. Please login again.',
            delete_confirm_title: 'Delete this key?',
            delete_confirm_desc: 'This action cannot be undone.',
            delete_confirm_yes: 'Yes, delete',
            delete_confirm_no: 'Cancel',
            // Footer
            footer_made_with: 'Made with <span class="footer-heart">❤️</span> by <a href="https://discord.gg/ucm7pKGrVv" target="_blank" rel="noopener noreferrer">CrewCore Team</a>',
            donate_button: 'Donate ❤️',
            donate_subtitle: '(support development, not premium)',
            // === TWO-STEP VERIFICATION MODAL ===
            twostep_title: '🔐 2-Step Verification',
            twostep_desc: 'Complete both steps to generate your key',
            step1_name: 'First Verification',
            step1_desc: 'Complete the first link',
            step1_btn: 'Start Step 1',
            step2_name: 'Final Verification',
            step2_desc: 'Complete to receive your key',
            step2_btn: 'Start Step 2',
            step2_locked: 'Complete Step 1 first',
            twostep_hint: '⏱️ You have 15 minutes to complete both steps',
            step1_badge: 'STEP 1',
            step2_badge: 'STEP 2',
            // === FLOW GUIDE & UX ===
            welcome_headline: 'Generate your key and play Among Us with mods in minutes',
            flow_step1: 'Login',
            flow_step2: 'Generate Key',
            flow_step3: 'Download Mod',
            flow_step4: 'Play!',
            mission_kicker: 'CrewCore Pulse',
            mission_title: 'Your journey starts here',
            mission_greeting_guest: 'Sign in with Discord to personalize your experience and track your progress in real time.',
            mission_greeting_member: 'Welcome back, {name}. Your terminal is ready for a new key.',
            mission_greeting_join: 'Hi {name}. Join our Discord server to unlock key generation.',
            mission_chip_guest: 'Session: guest',
            mission_chip_session: 'Session: @{name}',
            mission_chip_server_pending: 'Server: pending',
            mission_chip_server_yes: 'Server: verified',
            mission_chip_server_no: 'Server: not verified',
            mission_chip_plan_free: 'Plan: free',
            mission_chip_plan_premium: 'Plan: premium',
            mission_cta_login: 'Login with Discord',
            mission_cta_join: 'Join Discord server',
            mission_cta_generate: 'Generate my key now',
            keys_empty_msg: 'No keys generated yet. Click START TASK to get started!',
            next_steps_label: 'Next step:',
            next_steps_text: 'Copy the key above, download the mod and paste it in the game activator',
            // === PREMIUM & PROFILE ===
            prem_urgency: '🔥 Promotional prices — may increase at any time',
            prem_guarantee: '✅ Instant activation after payment • Discord support',
            premium_active_label: 'PREMIUM',
            skip_to_content: 'Skip to content'
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
            key_limit_text: 'Você possui {count} ID{s} ativa{s} (máximo: {max} ativas por conta)',
            key_limit_helper: '💡 Máximo de 5 keys ativas por vez. Use ou delete uma para gerar mais — infinitamente!',
            generate_button: '🚀 START TASK',
            generate_button_hint: 'Gere sua key do mod aqui',
            key_empty_state: 'Clique em START TASK para gerar sua key',
            view_keys_button: '🛰️ LOG DE SISTEMA',
            key_label: 'ID de Tripulante Designada:',
            copy_button: '📋 Copiar ID',
            generated_at: '📅 Gerada em:',
            key_type: '🔑 Tipo: Acesso MIRA HQ',
            key_status: '⏱️ Status: Ativa',
            records_title: 'Registros de IDs - Ciclo Atual',
            no_records: 'Nenhum registro de ID neste terminal para o ciclo atual.',
            support_button: '🆘 Suporte',
            donate_button: 'Doar ❤️',
            donate_subtitle: '(apoie o desenvolvimento, não é premium)',
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
            limit_reached: '⚠️ LIMITE: 5 keys ativas. Use ou delete uma para gerar mais!',
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
            download_badge: '📡 ESTAÇÃO DE DOWNLOAD',
            download_title: 'ModMenuCrew',
            version_latest: '✅ Última versão',
            download_hint: '🔒 Download seguro via Cloudflare',
            platform_steam: 'Steam',
            platform_epic: 'Epic Games',
            turnstile_hint: 'Complete a verificação acima para desbloquear os métodos',
            turnstile_success: '✅ Verificado! Selecione um método abaixo',
            // === DOWNLOAD TURNSTILE ===
            download_turnstile_hint: '🔒 Complete a verificação para liberar o download',
            download_turnstile_success: '✅ Verificado! Selecione a plataforma abaixo',
            download_turnstile_error: '❌ Erro na verificação. Tente recarregar a página.',
            download_turnstile_expired: '⚠️ Verificação expirada. Complete novamente.',
            download_turnstile_required: '🔒 Complete a verificação Cloudflare primeiro!',
            // === ANTI-BYPASS CHALLENGE ===
            challenge_title: '🔐 Verificação de Segurança',
            challenge_subtitle: 'Complete o desafio para provar que você é humano',
            challenge_timeout: 'Tempo restante:',
            challenge_attempts: 'Tentativas:',
            challenge_solving: 'Verificando resposta...',
            challenge_success: '✅ Desafio completo!',
            challenge_wrong: '❌ Ops! Resposta errada. Tente novamente.',
            challenge_expired: '⏰ Tempo expirado. Sem problemas, comece novamente!',
            challenge_blocked: '🚫 Tentativa de bypass detectada! Aguarde 1 minuto.',
            challenge_bypass_detected: '⚠️ Bypass detectado! Você deve completar o encurtador corretamente.',
            verification_processing: '⏳ Processando retorno...',
            challenge_hint: '⚠️ Complete para receber sua key',
            // === PREMIUM ===
            premium_title: 'Pule a verificação',
            plan_popular: 'POPULAR',
            plan_best: 'MELHOR VALOR',
            plan_48h_name: '48 Horas',
            plan_monthly_name: '30 Dias',
            feature_no_verification: 'Sem verificação',
            feature_unlimited: 'Uso ilimitado',
            feature_instant: 'Ativação instantânea',
            feature_priority: 'Suporte prioritário',
            feature_updates: 'Acesso antecipado',
            buy_now: 'Comprar',
            secure_payment: 'Pagamento seguro via Stripe',
            premium_active_title: '⭐ PREMIUM ATIVO',
            premium_active_text: 'Você possui acesso {type} ativo!',
            premium_active_sub: 'Sua key é única e pode ser usada ilimitadamente até expirar.',
            premium_keys_title: '⭐ Suas Keys Premium',
            // Plan Details (hover)
            detail_no_verification: '✓ Sem verificação',
            detail_unlimited_keys: '✓ Uso ilimitado',
            detail_expires_48h: '⏱️ Expira em 48 horas',
            detail_7days_access: '⏱️ 7 dias de acesso',
            detail_30days_access: '⏱️ 30 dias de acesso',
            detail_90days_access: '⏱️ 90 dias de acesso',
            detail_1year_access: '⏱️ 1 ano completo',
            detail_never_expires: '♾️ NUNCA expira',
            detail_auto_renew: '🔄 Renova automático',
            detail_renew_3months: '🔄 Renova a cada 3 meses',
            detail_renew_yearly: '🔄 Renova anualmente',
            detail_priority_support: '⚡ Suporte prioritário',
            detail_vip_support: '⚡ Suporte VIP',
            detail_pay_once: '🎁 Pague uma vez só',
            detail_save_28: '💰 28% economia',
            detail_save_20: '💰 20% economia',
            detail_save_50: '💰 50% economia',
            // Premium Comparison & Social Proof
            prem_title: 'Pare de sofrer com links',
            prem_subtitle: 'Jogue sem interrupções, com features exclusivas',
            prem_free_label: 'Gratuito',
            prem_premium_label: 'Premium',
            prem_free_1: '2 links por key',
            prem_free_2: 'Expira ao fechar o jogo',
            prem_free_3: 'Máximo 5 keys ativas por vez',
            prem_free_4: 'Sem features exclusivas',
            prem_pro_1: 'Key instantânea, zero links',
            prem_pro_2: 'Ativa até o plano expirar',
            prem_pro_3: 'Uso ilimitado',
            prem_pro_4: '🎨 Todos da mesma cor',
            prem_pro_5: '🐍 Sempre Viper / Phantom',
            prem_social_proof: '<strong id="premiumActiveCount">--</strong> jogadores usam Premium agora',
            prem_most_popular: '⭐ MAIS POPULAR',
            prem_best_value: '🏆 MELHOR VALOR',
            prem_try: 'Experimentar',
            prem_card_instant: '⚡ Key instantânea',
            prem_card_nolinks: '🚫 Zero links',
            prem_card_allfeatures: '✨ Todas as features',
            prem_card_colors: '🎨 Mesma cor p/ todos',
            prem_card_roles: '🐍 Sempre Viper/Phantom',
            prem_per_day_30: '~R$0,83/dia',
            prem_per_day_90: '~R$0,66/dia',
            prem_cancel: 'Cancele quando quiser',
            // Plan Names
            plan_48h: '48h',
            plan_7days: '7 Dias',
            plan_30days: '30 Dias',
            plan_90days: '90 Dias',
            plan_365days: '365 Dias',
            plan_lifetime: 'Lifetime',
            plan_forever: 'Para sempre!',
            plan_per_month: '~R$12/mês',
            verifying_payment: 'Verificando pagamento...',
            // Elite Network
            premium_badge: '⚡ ACESSO ELITE',
            net_online: 'online agora',
            net_keys_today: 'keys hoje',
            net_members: 'no Discord',
            net_uptime: 'hrs uptime',
            net_uptime_percent: 'uptime',
            // Premium Success Modal
            premium_payment_confirmed: 'Pagamento Confirmado!',
            premium_key_ready: 'Sua chave Premium está pronta!',
            premium_your_key: '⭐ SUA CHAVE PREMIUM',
            premium_copy_key: '📋 COPIAR CHAVE',
            premium_how_to_use: '📖 Como usar:',
            premium_step_1: 'Abra o Among Us com o mod instalado',
            premium_step_2: 'Pressione <strong>F1</strong> no menu principal',
            premium_step_3: 'Cole a chave no campo de ativação',
            premium_step_4: 'Aproveite o acesso Premium por 48h! 🚀',
            // === PREMIUM USER PANEL ===
            premium_panel_badge: '👑 PREMIUM ATIVO',
            premium_panel_title: 'Gerenciar Key Premium',
            premium_label_key: '🔑 Key:',
            premium_label_plan: '📦 Plano:',
            premium_label_expires: '⏱️ Expira:',
            premium_hwid_bound: 'Vinculado',
            premium_hwid_unbound: 'Não vinculado',
            premium_reset_hwid: 'Resetar HWID',
            premium_reset_cooldown: '1x por dia',
            premium_panel_hint: 'Use o reset para mudar de dispositivo. Disponível 1x a cada 24h.',
            premium_available_in: 'Disponível em {hours}h',
            // Delete Key
            delete_key_button: '🗑️',
            delete_key_confirm: 'Tem certeza que deseja excluir esta key?',
            delete_key_deleting: '🗑️ Excluindo...',
            delete_key_success: '✅ Key excluída com sucesso!',
            delete_key_error: '❌ Erro ao excluir key',
            session_expired: 'Sessão expirada. Faça login novamente.',
            captcha_first: 'Complete o captcha primeiro.',
            captcha_expired: 'Captcha expirado. Complete novamente.',
            step1_done: '✅ Passo 1 concluído! Passo 2 liberado.',
            security_checking: 'Verificando segurança... aguarde.',
            session_expired_login: 'Sessão expirada. Faça login novamente.',
            delete_confirm_title: 'Excluir esta key?',
            delete_confirm_desc: 'Esta ação não pode ser desfeita.',
            delete_confirm_yes: 'Sim, excluir',
            delete_confirm_no: 'Cancelar',
            // Footer
            footer_made_with: 'Feito com <span class="footer-heart">❤️</span> por <a href="https://discord.gg/ucm7pKGrVv" target="_blank" rel="noopener noreferrer">CrewCore Team</a>',
            download_client_title: 'Baixar Mod',
            download_client_subtitle: 'Mod V6.0.6d • Game v17.1.0',
            download_now: 'BAIXAR AGORA',
            dl_chip_instant: 'Ativação Instantânea',
            dl_chip_undetected: 'Indetectável',
            dl_chip_easy: 'Fácil de Usar',
            dl_verify_label: 'Verificação necessária para download',
            dl_trust_cf: 'Via Cloudflare R2',
            dl_trust_scan: 'Scan diário',
            dl_trust_update: 'Atualizado hoje',
            // === TWO-STEP VERIFICATION MODAL ===
            twostep_title: '🔐 Verificação em 2 Passos',
            twostep_desc: 'Complete os dois passos para gerar sua key',
            step1_name: 'Primeira Verificação',
            step1_desc: 'Complete o primeiro link',
            step1_btn: 'Iniciar Passo 1',
            step2_name: 'Verificação Final',
            step2_desc: 'Complete para receber sua key',
            step2_btn: 'Iniciar Passo 2',
            step2_locked: 'Complete o Passo 1 primeiro',
            twostep_hint: '⏱️ Você tem 15 minutos para completar ambos os passos',
            step1_badge: 'PASSO 1',
            step2_badge: 'PASSO 2',
            // === FLOW GUIDE & UX ===
            welcome_headline: 'Gere sua key e jogue Among Us com mods em minutos',
            flow_step1: 'Login',
            flow_step2: 'Gerar Key',
            flow_step3: 'Baixar Mod',
            flow_step4: 'Jogar!',
            mission_kicker: 'CrewCore Pulse',
            mission_title: 'Sua jornada começa aqui',
            mission_greeting_guest: 'Faça login com Discord para personalizar sua experiência e acompanhar seu progresso em tempo real.',
            mission_greeting_member: 'Bem-vindo de volta, {name}. Seu terminal já está pronto para uma nova key.',
            mission_greeting_join: 'Olá, {name}. Entre no nosso servidor Discord para liberar a geração de keys.',
            mission_chip_guest: 'Sessão: visitante',
            mission_chip_session: 'Sessão: @{name}',
            mission_chip_server_pending: 'Servidor: pendente',
            mission_chip_server_yes: 'Servidor: verificado',
            mission_chip_server_no: 'Servidor: não verificado',
            mission_chip_plan_free: 'Plano: gratuito',
            mission_chip_plan_premium: 'Plano: premium',
            mission_cta_login: 'Entrar com Discord',
            mission_cta_join: 'Entrar no servidor',
            mission_cta_generate: 'Gerar minha key agora',
            keys_empty_msg: 'Nenhuma key gerada ainda. Clique em START TASK para começar!',
            next_steps_label: 'Próximo passo:',
            next_steps_text: 'Copie a key acima, baixe o mod e cole no ativador do jogo',
            // === PREMIUM & PROFILE ===
            prem_urgency: '🔥 Preços promocionais — podem aumentar a qualquer momento',
            prem_guarantee: '✅ Ativação instantânea após pagamento • Suporte via Discord',
            premium_active_label: 'PREMIUM',
            skip_to_content: 'Pular para o conteúdo'
        }
    };

    // ==========================================
    // ELITE PLATFORM EFFECTS & LIVE STATS
    // ==========================================
    function initEliteEffects() {
        // 1. Live Platform Stats (polls /platform-stats every 30s)
        const statsElements = {
            online: document.getElementById('netOnline'),
            keysToday: document.getElementById('netKeysToday'),
            totalUsers: document.getElementById('netTotalUsers'),
            uptime: document.getElementById('netUptime'),
            uptimePercent: document.getElementById('netUptimePercent')
        };

        let lastStats = {};
        let statsFetchFailCount = 0;

        function animateCounter(el, newValue) {
            if (!el) return;
            const formatted = typeof newValue === 'number' ? newValue.toLocaleString() : String(newValue);
            if (el.textContent === formatted) return;
            el.textContent = formatted;
            el.classList.add('updated');
            setTimeout(() => el.classList.remove('updated'), 800);
        }

        async function fetchPlatformStats() {
            try {
                const res = await fetchWithTimeout(
                    `${CONFIG.API_BASE_URL}/platform-stats`,
                    {},
                    Math.min(CONFIG.REQUEST_TIMEOUT, 8000),
                    1
                );
                if (!res.ok) return;
                const json = await res.json();
                if (json.status !== 'success' || !json.data) return;
                const d = json.data;

                animateCounter(statsElements.online, d.online_now || 0);
                animateCounter(statsElements.keysToday, d.keys_today || 0);
                animateCounter(statsElements.totalUsers, d.discord_members || 0);
                animateCounter(statsElements.uptime, d.uptime_hours || 0);
                if (statsElements.uptimePercent) {
                    const pct = d.uptime_percent !== undefined ? d.uptime_percent : 0;
                    statsElements.uptimePercent.textContent = pct + '%';
                    statsElements.uptimePercent.classList.add('updated');
                    setTimeout(() => statsElements.uptimePercent.classList.remove('updated'), 800);
                }

                // Update premium active count for social proof
                const premCountEl = document.getElementById('premiumActiveCount');
                if (premCountEl && d.premium_active !== undefined) {
                    premCountEl.textContent = d.premium_active;
                }

                // Update download modal "Updated" date from R2 object metadata
                if (d.mod_updated_at) {
                    const modDate = new Date(d.mod_updated_at);
                    const lang = appState.currentLanguage;
                    const now = new Date();
                    const diffDays = Math.floor((now - modDate) / (1000 * 60 * 60 * 24));
                    let dateStr;
                    if (diffDays === 0) {
                        dateStr = lang === 'pt' ? 'Atualizado hoje' : 'Updated today';
                    } else if (diffDays === 1) {
                        dateStr = lang === 'pt' ? 'Atualizado ontem' : 'Updated yesterday';
                    } else {
                        dateStr = (lang === 'pt' ? 'Atualizado ' : 'Updated ') + modDate.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' });
                    }
                    const updateEl = document.querySelector('[data-translate-key="dl_trust_update"]');
                    if (updateEl) updateEl.textContent = dateStr;
                }

                lastStats = d;
                statsFetchFailCount = 0;
                const bar = document.getElementById('networkBar');
                if (bar) bar.style.opacity = '';
            } catch (e) {
                console.debug('[Stats] Fetch failed:', e.message);
                statsFetchFailCount++;
                if (statsFetchFailCount >= 3) {
                    const bar = document.getElementById('networkBar');
                    if (bar) bar.style.opacity = '0.5';
                }
            }
        }

        // Initial fetch + poll every 30s
        fetchPlatformStats();
        setInterval(() => {
            if (!document.hidden) fetchPlatformStats();
        }, 30000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) fetchPlatformStats();
        });

        // Fetch Discord server icon for download modal
        (async () => {
            try {
                const inviteCode = 'ucm7pKGrVv';
                if (!inviteCode) return;
                const res = await fetch(`https://discord.com/api/v9/invites/${inviteCode}?with_counts=true`, { signal: AbortSignal.timeout(5000) });
                if (!res.ok) return;
                const data = await res.json();
                if (data.guild && data.guild.icon) {
                    const ext = data.guild.icon.startsWith('a_') ? 'gif' : 'png';
                    const iconUrl = `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.${ext}?size=128`;
                    const iconEl = document.getElementById('dlServerIcon');
                    if (iconEl) iconEl.src = iconUrl;
                }
            } catch (e) {
                console.debug('[DL] Discord icon fetch failed:', e.message);
            }
        })();

        // Skip mousemove-heavy effects on touch devices
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // 2. Magnetic Button Effect (desktop only)
        const mainBtn = document.getElementById('btnOpenMethodMenu');
        if (mainBtn && !isTouchDevice) {
            const magnetStrength = 0.35;
            const magnetRange = 100;
            let btnRect = mainBtn.getBoundingClientRect();
            let magnetThrottled = false;

            window.addEventListener('scroll', () => { btnRect = mainBtn.getBoundingClientRect(); }, { passive: true });
            window.addEventListener('resize', () => { btnRect = mainBtn.getBoundingClientRect(); }, { passive: true });

            document.addEventListener('mousemove', (e) => {
                if (magnetThrottled) return;
                magnetThrottled = true;
                requestAnimationFrame(() => { magnetThrottled = false; });
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                if (mainBtn.offsetParent === null) return;

                const dx = e.clientX - (btnRect.left + btnRect.width / 2);
                const dy = e.clientY - (btnRect.top + btnRect.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < magnetRange) {
                    const tx = dx * magnetStrength;
                    const ty = dy * magnetStrength;
                    mainBtn.style.transform = `translate(${tx}px, ${ty}px) scale(1.05)`;

                    if (!mainBtn.hasMagnetSoundPlayed && appState.soundEnabled) {
                        playSound(100, 150, 'triangle');
                        mainBtn.hasMagnetSoundPlayed = true;
                    }
                } else {
                    mainBtn.style.transform = 'translate(0, 0) scale(1)';
                    mainBtn.hasMagnetSoundPlayed = false;
                }
            }, { passive: true });
        }

        // 3. Holographic 3D Tilt on Premium Cards (desktop only)
        const cards = document.querySelectorAll('.premium-plan');
        if (cards.length > 0 && !isTouchDevice) {
            let cardRects = [];
            let isAnimating = false;
            let mouseX = 0;
            let mouseY = 0;

            const updateCardRects = () => {
                cardRects = Array.from(cards).map(card => ({
                    element: card,
                    rect: card.getBoundingClientRect()
                }));
            };

            updateCardRects();
            window.addEventListener('scroll', updateCardRects, { passive: true });
            window.addEventListener('resize', updateCardRects, { passive: true });

            const animateCards = () => {
                if (!isAnimating) return;
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    isAnimating = false;
                    return;
                }

                cardRects.forEach(({ element, rect }) => {
                    const x = mouseX - rect.left;
                    const y = mouseY - rect.top;

                    if (x > -50 && x < rect.width + 50 && y > -50 && y < rect.height + 50) {
                        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -10;
                        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 10;

                        element.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
                        element.style.setProperty('--shine-x', ((x / rect.width) * 100).toFixed(1) + '%');
                        element.style.setProperty('--shine-y', ((y / rect.height) * 100).toFixed(1) + '%');
                    } else if (element.style.transform) {
                        element.style.transform = '';
                    }
                });

                requestAnimationFrame(animateCards);
            };

            document.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
                if (!isAnimating) {
                    isAnimating = true;
                    requestAnimationFrame(animateCards);
                }
                clearTimeout(window.hoverTimeout);
                window.hoverTimeout = setTimeout(() => { isAnimating = false; }, 500);
            }, { passive: true });
        }
    }

    // Initialize effects
    initEliteEffects();

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
            const closeBtn = elements.userProfileModal ? elements.userProfileModal.querySelector('.close-modal') : null;
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
                const response = await fetchWithTimeout(`${CONFIG.API_BASE_URL}/auth/discord`, {}, CONFIG.REQUEST_TIMEOUT, 1);
                const data = await response.json();
                // SECURITY: Validate redirect URL to prevent open redirect
                if (data.status === 'success' && typeof data.auth_url === 'string' && data.auth_url.startsWith('https://discord.com/')) window.location.href = data.auth_url;
            } catch (error) {
                showUIMessage(translations[appState.currentLanguage].auth_error, 'error');
            }
        }

        async handleCallbackFromURL() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            // NEW: Handle direct discord_session from server redirect (2026)
            // Using discord_session (not session_id) to avoid conflict with Stripe payment verification
            const directSessionId = urlParams.get('discord_session');
            const directUsername = urlParams.get('username');
            const directDiscordId = urlParams.get('discord_id');
            const directAvatar = urlParams.get('avatar');

            if (directSessionId && directUsername) {
                // Server already processed OAuth and sent us the session directly
                console.log('[Discord] Received direct session from server redirect');
                await this.handleAuthSuccess({
                    session_id: directSessionId,
                    user: {
                        id: directDiscordId,
                        username: directUsername,
                        avatar: directAvatar || null // Avatar hash, not URL
                    },
                    message: `👋 Bem-vindo, ${directUsername}!`
                });
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            // Legacy: Handle code/state callback (for popup flow)
            if (code && state) {
                try {
                    showUIMessage(translations[appState.currentLanguage].auth_verifying, 'info');
                    const response = await fetchWithTimeout(`${CONFIG.API_BASE_URL}/auth/discord/callback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, state })
                    }, CONFIG.REQUEST_TIMEOUT, 1);
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
            // SECURITY: Validate URL protocol to prevent javascript: XSS
            const safeInvite = (typeof data.discord_invite === 'string' && /^https?:\/\//i.test(data.discord_invite))
                ? data.discord_invite : 'https://discord.gg/ucm7pKGrVv';
            elements.authSection.innerHTML = `
              <div class="server-required-message">
                <p>${translations[lang].server_required_msg_title}</p>
                <a href="${safeInvite}" target="_blank" rel="noopener noreferrer" class="server-invite-btn">${translations[lang].server_required_msg_btn}</a>
                <p style="margin-top: 0.5rem; font-size: 0.9em;">${translations[lang].server_required_msg_desc}</p>
              </div>`;
        }

        async validateSession() {
            if (!this.sessionId) return false;
            try {
                const response = await fetchWithTimeout(
                    `${CONFIG.API_BASE_URL}/auth/me`,
                    { headers: { 'X-Session-ID': this.sessionId } },
                    CONFIG.REQUEST_TIMEOUT,
                    1
                );
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
                const response = await fetchWithTimeout(
                    `${CONFIG.API_BASE_URL}/auth/user-stats`,
                    { headers: { 'X-Session-ID': this.sessionId } },
                    CONFIG.REQUEST_TIMEOUT,
                    1
                );
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
                        updateMissionPanel();
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

            // Animação de atualização nos stats
            const animateStat = (el, value) => {
                el.textContent = value;
                el.classList.add('updating');
                setTimeout(() => el.classList.remove('updating'), 500);
            };
            animateStat(elements.statKeysToday, this.userStats.keys_today);
            animateStat(elements.statTotalKeys, this.userStats.keys_total);
            animateStat(elements.statActiveKeys, this.userStats.keys_active);

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

            // === TIER BADGE (based on total keys generated) ===
            const tierBadge = document.getElementById('avatarTierBadge');
            if (tierBadge) {
                const total = this.userStats.keys_total || 0;
                tierBadge.className = 'avatar-tier-badge';
                if (total >= 100) {
                    tierBadge.textContent = '💎';
                    tierBadge.classList.add('visible', 'tier-diamond');
                } else if (total >= 50) {
                    tierBadge.textContent = '🥇';
                    tierBadge.classList.add('visible', 'tier-gold');
                } else if (total >= 20) {
                    tierBadge.textContent = '🥈';
                    tierBadge.classList.add('visible', 'tier-silver');
                } else if (total >= 5) {
                    tierBadge.textContent = '🥉';
                    tierBadge.classList.add('visible', 'tier-bronze');
                }
            }

            // === PREMIUM RING + BADGE ===
            const avatarRing = document.getElementById('avatarRing');
            const premBadge = document.getElementById('modalPremiumBadge');
            const isPremium = this.userStats.is_premium || false;
            if (avatarRing) {
                avatarRing.classList.toggle('premium', isPremium);
            }
            if (premBadge) {
                if (isPremium) {
                    premBadge.textContent = '👑 ' + (translations[lang].premium_active_label || 'PREMIUM');
                    premBadge.style.display = '';
                } else {
                    premBadge.style.display = 'none';
                }
            }
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
                        headers: { 'Content-Type': 'application/json', 'X-Session-ID': this.sessionId },
                        body: JSON.stringify({ session_id: this.sessionId })
                    }).catch(e => console.warn('Logout request failed:', e));
                } catch (error) { console.error('Erro no logout:', error); }
            }

            ['crewbot_session', 'crewbot_user', 'crewbot_stats', 'crewbot_session_expires'].forEach(k => localStorage.removeItem(k));
            // Limpa também dados de bypass pendentes
            clearBypassStorage();
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

            // Update flow guide
            updateFlowGuide(isAuthenticated ? 'logged-in' : 'initial');

            if (isAuthenticated) {
                const userId = this.userData.id || this.userData.userId;
                const avatarUrl = this.getAvatarUrl(userId, this.userData.avatar, 40);
                elements.userAvatarHeader.src = avatarUrl;
                elements.userNameHeader.textContent = this.userData.global_name || this.userData.username;
                elements.userDiscriminatorHeader.textContent = `@${this.userData.username}`;
                this.updateGenerateButton(this.userStats ? this.userStats.is_server_member : false);
            }

            updateMissionPanel();
        }

        updateGenerateButton(isServerMember) {
            // Update all 3 method buttons
            if (elements.btnOpenMethodMenu) {
                const btn = elements.btnOpenMethodMenu;
                const lang = appState.currentLanguage; // Define lang here
                if (isServerMember && this.isAuthenticated) {
                    btn.disabled = false;
                    btn.title = '';
                } else {
                    btn.disabled = true;
                    if (!this.isAuthenticated) {
                        btn.title = lang === 'pt' ? 'Faça login com Discord para gerar keys' : 'Login with Discord to generate keys';
                    } else {
                        btn.title = lang === 'pt' ? 'Entre no servidor Discord para gerar keys' : 'Join our Discord server to generate keys';
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

    function setMissionChip(el, text, tone) {
        if (!el) return;
        el.textContent = text;
        el.setAttribute('data-tone', tone || 'dim');
    }

    function updateMissionPanel() {
        if (!elements.missionGreeting) return;

        const lang = appState.currentLanguage || 'pt';
        const t = translations[lang] || translations.pt;
        const isAuthenticated = !!(discordAuth.isAuthenticated && discordAuth.userData);
        const userName = discordAuth.userData?.global_name || discordAuth.userData?.username || (lang === 'pt' ? 'Tripulante' : 'Crewmate');
        const isServerMember = typeof discordAuth.userStats?.is_server_member === 'boolean'
            ? discordAuth.userStats.is_server_member
            : !!discordAuth.userData?.isServerMember;
        const isPremium = !!discordAuth.userStats?.is_premium;

        if (!isAuthenticated) {
            elements.missionGreeting.textContent = t.mission_greeting_guest;
            setMissionChip(elements.missionAuthChip, t.mission_chip_guest, 'warn');
            setMissionChip(elements.missionServerChip, t.mission_chip_server_pending, 'dim');
            setMissionChip(elements.missionPremiumChip, t.mission_chip_plan_free, 'dim');
            return;
        }

        if (isServerMember) {
            elements.missionGreeting.textContent = t.mission_greeting_member.replace('{name}', userName);
        } else {
            elements.missionGreeting.textContent = t.mission_greeting_join.replace('{name}', userName);
        }

        setMissionChip(elements.missionAuthChip, t.mission_chip_session.replace('{name}', userName), 'ok');
        setMissionChip(elements.missionServerChip, isServerMember ? t.mission_chip_server_yes : t.mission_chip_server_no, isServerMember ? 'ok' : 'warn');
        setMissionChip(elements.missionPremiumChip, isPremium ? t.mission_chip_plan_premium : t.mission_chip_plan_free, isPremium ? 'ok' : 'dim');
    }

    async function handleMissionCTA() {
        if (!discordAuth.isAuthenticated) {
            if (elements.discordAuthBtn) elements.discordAuthBtn.click();
            return;
        }

        if (!discordAuth.userStats?.is_server_member) {
            openDiscordWidget();
            return;
        }

        await openTwoStepModal();
    }

    // ==================== FLOW GUIDE SYSTEM ====================
    function updateFlowGuide(state) {
        const steps = document.querySelectorAll('.flow-step-mini');
        if (!steps.length) return;

        // Reset all steps
        steps.forEach(s => s.classList.remove('active', 'done'));

        switch (state) {
            case 'initial':
                // Step 1 (Login) is active
                if (steps[0]) steps[0].classList.add('active');
                break;
            case 'logged-in':
                // Step 1 done, Step 2 (Generate Key) active
                if (steps[0]) steps[0].classList.add('done');
                if (steps[1]) steps[1].classList.add('active');
                break;
            case 'key-generated':
                // Steps 1-2 done, Step 3 (Download) active
                if (steps[0]) steps[0].classList.add('done');
                if (steps[1]) steps[1].classList.add('done');
                if (steps[2]) steps[2].classList.add('active');
                break;
            case 'downloaded':
                // Steps 1-3 done, Step 4 (Play) active
                if (steps[0]) steps[0].classList.add('done');
                if (steps[1]) steps[1].classList.add('done');
                if (steps[2]) steps[2].classList.add('done');
                if (steps[3]) steps[3].classList.add('active');
                break;
        }
    }

    // Expose to global scope for use by handleDownload (which is outside DOMContentLoaded)
    window.updateFlowGuide = updateFlowGuide;

    // Initialize flow guide on page load
    updateFlowGuide('initial');

    // sanitizeInput removido pois textContent já é seguro e isso causava escape duplo.

    function validateKey(key) { return typeof key === 'string' && /^[A-Z0-9-]{19}$/.test(key); }
    function validateToken(token) { return typeof token === 'string' && /^[a-zA-Z0-9\-_]{20,}$/.test(token); }

    // SECURITY: HTML entity escaping for innerHTML contexts with server data
    function escHtml(s) { return typeof s === 'string' ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

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
        elements.messageEl.className = `message visible show ${type}`;
        // Announce to screen readers
        elements.messageEl.setAttribute('role', 'alert');
        elements.messageEl.setAttribute('aria-live', 'polite');
        if (elements.messageEl.timeoutId) clearTimeout(elements.messageEl.timeoutId);
        if (duration > 0) elements.messageEl.timeoutId = setTimeout(() => {
            elements.messageEl.classList.remove('show');
            setTimeout(() => { elements.messageEl.className = 'message'; }, 300);
        }, duration);

        // Also show toast notification
        if (typeof toast !== 'undefined' && toast.show) {
            toast.show(sanitizedText, type, duration > 0 ? duration : 8000);
        }
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
                li.className = 'key-item';
                li.innerHTML = `
                    <span class="key-value">${escHtml(key)}</span>
                    <button class="key-delete-btn" title="${escHtml(translations[appState.currentLanguage].delete_key_confirm)}" data-key="${escHtml(key)}">
                        ${escHtml(translations[appState.currentLanguage].delete_key_button)}
                    </button>
                `;
                // Add click listener for delete button
                const deleteBtn = li.querySelector('.key-delete-btn');
                deleteBtn.addEventListener('click', (e) => handleDeleteKey(key, e.currentTarget));
                elements.keysListUl.appendChild(li);
            }
        });
    }

    // === DELETE KEY FUNCTION (SECURE) ===
    async function handleDeleteKey(key, triggerBtn) {
        const lang = appState.currentLanguage;

        // UX: Custom inline confirmation instead of native confirm()
        if (triggerBtn && !triggerBtn.dataset.confirmed) {
            triggerBtn.dataset.confirmed = 'pending';
            const origHTML = triggerBtn.innerHTML;
            triggerBtn.innerHTML = `<span style="font-size:0.75rem">${translations[lang].delete_confirm_yes}?</span>`;
            triggerBtn.classList.add('confirm-active');
            const revert = () => {
                triggerBtn.innerHTML = origHTML;
                triggerBtn.classList.remove('confirm-active');
                delete triggerBtn.dataset.confirmed;
            };
            // Auto-revert after 3s if not clicked again
            triggerBtn._revertTimeout = setTimeout(revert, 3000);
            return;
        }
        // Second click = confirmed
        if (triggerBtn) {
            clearTimeout(triggerBtn._revertTimeout);
            delete triggerBtn.dataset.confirmed;
        }

        try {
            showUIMessage(translations[lang].delete_key_deleting, 'info', 0);
            const headers = discordAuth.getAuthHeaders();
            const response = await fetch(`${CONFIG.API_BASE_URL}/delete_key?key=${encodeURIComponent(key)}`, {
                method: 'DELETE',
                headers
            });

            if (response.status === 401) {
                showUIMessage(translations[lang].session_expired, 'error');
                await discordAuth.logout();
                return;
            }

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                // Remove from local state and re-render
                appState.userKeys = appState.userKeys.filter(k => k !== key);
                renderKeysList();
                updateKeyLimitDisplay();
                await discordAuth.refreshStats();
                showUIMessage(translations[lang].delete_key_success, 'success');
                if (appState.soundEnabled) playSound(440, 150, 'sine');
            } else {
                showUIMessage(data.message || translations[lang].delete_key_error, 'error');
                if (appState.soundEnabled) playSound(200, 300, 'sawtooth');
            }
        } catch (error) {
            console.error('[DeleteKey] Error:', error);
            showUIMessage(translations[lang].delete_key_error, 'error');
            if (appState.soundEnabled) playSound(200, 300, 'sawtooth');
        }
    }

    function createConfetti(x, y) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const colors = ['#ffcb74', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
        confetti({
            particleCount: 60,
            spread: 70,
            origin: { x: x / window.innerWidth, y: y / window.innerHeight },
            colors: colors,
            disableForReducedMotion: true
        });
    }

    function triggerConfetti() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const duration = 1500;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ffcb74', '#e74c3c', '#3498db'],
                disableForReducedMotion: true
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ffcb74', '#e74c3c', '#3498db'],
                disableForReducedMotion: true
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
        // Fade out mais rápido para mostrar a key sendo escrita
        setTimeout(() => {
            overlay.classList.add('fading');
        }, 1200);
        setTimeout(() => {
            overlay.classList.remove('show', 'fading');
        }, 1800);
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
        const total = remaining;
        elements.cooldownTime.textContent = `${remaining}s`;

        // UX: Animate cooldown progress bar
        const progressFill = document.getElementById('cooldownProgressFill');
        if (progressFill) progressFill.style.width = '100%';

        appState.cooldownTimer = setInterval(() => {
            remaining--;
            elements.cooldownTime.textContent = `${remaining}s`;
            if (progressFill) progressFill.style.width = `${(remaining / total) * 100}%`;
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

            // === ANTI-BYPASS: Usa proof_token em vez de verification_token ===
            const proofToken = appState.proofToken || localStorage.getItem(CONFIG.BYPASS_PROOF_TOKEN_KEY);
            if (!proofToken || !validateToken(proofToken)) {
                throw new Error('Token de prova ausente. Complete a verificação primeiro.');
            }

            showUIMessage(translations[appState.currentLanguage].connecting_server, 'info', 0);
            const headers = { 'X-Proof-Token': proofToken, ...discordAuth.getAuthHeaders() };
            const response = await fetch(`${CONFIG.API_BASE_URL}/generate_key`, { method: 'GET', headers });

            if (response.status === 401) {
                showUIMessage(translations[appState.currentLanguage].session_expired_login, 'error');
                await discordAuth.logout();
                return;
            }

            const data = await response.json();

            elements.keyValueEl.classList.remove('processing');

            // === ANTI-BYPASS: Limpa proof token após uso ===
            clearBypassStorage();

            if (response.ok && data.status === 'success' && validateKey(data.key)) {
                // Visual Dopamine Sequence
                showAccessGranted();
                triggerConfetti();

                elements.keyContainerEl.classList.add('visible', 'success');
                elements.keyContainerEl.classList.add('pop-in');

                // UX: Smooth scroll key into view
                setTimeout(() => {
                    elements.keyContainerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 400);

                // Remove success class after animation
                setTimeout(() => elements.keyContainerEl.classList.remove('success'), 600);

                // Delay showing the key to sync with overlay fade out
                setTimeout(() => {
                    typeWriterEffect(data.key, elements.keyValueEl);
                }, 1300);

                elements.keyActions.style.display = 'flex';
                elements.keyMetadata.style.display = 'block';
                elements.keyTimestamp.textContent = new Date().toLocaleString('pt-BR');

                // Show next steps hint
                const nextSteps = document.getElementById('keyNextSteps');
                if (nextSteps) nextSteps.style.display = 'block';

                // Update flow guide steps
                updateFlowGuide('key-generated');

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
                    showUIMessage(translations[appState.currentLanguage].security_checking, 'info', 2000);
                    setTimeout(() => generateNewKey(), 2500); // Tenta de novo em 2.5s
                    return;
                }

                if (response.status === 429) startCooldown(60);
                showUIMessage(errorMessage, 'error');
                if (appState.soundEnabled) playSound(200, 500, 'sawtooth');
            }
        } catch (error) {
            elements.keyValueEl.classList.remove('processing');
            clearBypassStorage();
            showUIMessage(translations[appState.currentLanguage].emergency_error.replace('{error}', error.message), 'error');
            if (appState.soundEnabled) playSound(150, 800, 'sawtooth');
        } finally {
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
            const response = await fetchWithTimeout(
                `${CONFIG.API_BASE_URL}/user_keys`,
                { headers },
                CONFIG.REQUEST_TIMEOUT,
                1
            );

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

    // Busca status premium do usuário e keys premium
    async function fetchUserPremiumStatus() {
        if (!discordAuth.isAuthenticated || !discordAuth.sessionId) return;

        try {
            const headers = discordAuth.getAuthHeaders();
            const response = await fetchWithTimeout(
                `${CONFIG.API_BASE_URL}/user_premium_keys`,
                { headers },
                CONFIG.REQUEST_TIMEOUT,
                1
            );

            if (response.status === 401) return;

            const data = await response.json();
            if (response.ok && data.status === 'success') {
                appState.userPremiumKeys = data.premium_keys || [];
                appState.hasActivePremium = data.has_active_premium || false;
                appState.activePremiumType = data.active_key_type || null;

                // Se usuário é premium ativo, esconde a seção de upsell e mostra badge
                const premiumSection = document.getElementById('premiumSection');
                if (premiumSection) {
                    if (appState.hasActivePremium) {
                        // Substitui conteúdo por status premium (com suporte a tradução)
                        const lang = appState.currentLanguage || 'pt';
                        const t = translations[lang];
                        premiumSection.innerHTML = `
                            <div class="premium-active-banner">
                                <span class="premium-badge-large">${t.premium_active_title}</span>
                                <p class="premium-status-text">
                                    ${t.premium_active_text.replace('{type}', `<strong>${escHtml((appState.activePremiumType || '').toString().toUpperCase())}</strong>`)}
                                </p>
                                <p class="premium-status-sub">${t.premium_active_sub}</p>
                            </div>
                        `;
                        premiumSection.style.display = 'block';
                    } else {
                        // Mostra seção de upsell normalmente
                        premiumSection.style.display = 'block';
                    }
                }

                // Adiciona keys premium à lista de exibição
                renderPremiumKeysList();

                // Cache data globally so loadPremiumPanel() can reuse it
                // instead of making a duplicate /user_premium_keys request
                window._premiumKeysData = data;
                if (typeof loadPremiumPanel === 'function') loadPremiumPanel();
            }
        } catch (error) {
            console.error('Erro ao verificar status premium:', error);
        }
    }

    // Renderiza keys premium na lista (exclui expiradas)
    function renderPremiumKeysList() {
        // Filtra apenas keys que NÃO estão expiradas
        const activeKeys = (appState.userPremiumKeys || []).filter(k => k.status !== 'expired');
        if (activeKeys.length === 0) {
            // Remove seção se não houver keys ativas
            const existingSection = document.getElementById('premiumKeysSection');
            if (existingSection) existingSection.remove();
            return;
        }

        // Adiciona seção de keys premium acima das standard
        const lang = appState.currentLanguage || 'pt';
        const t = translations[lang];
        let premiumSection = document.getElementById('premiumKeysSection');
        if (!premiumSection) {
            premiumSection = document.createElement('section');
            premiumSection.id = 'premiumKeysSection';
            premiumSection.className = 'keys-list-section premium-keys-section';
            premiumSection.innerHTML = `<h2>${t.premium_keys_title}</h2><ul id="premiumKeysList"></ul>`;

            // Insere antes da seção de keys normais
            const standardSection = document.querySelector('.keys-list-section');
            if (standardSection) {
                standardSection.parentNode.insertBefore(premiumSection, standardSection);
            }
        }

        const listEl = document.getElementById('premiumKeysList');
        if (listEl) {
            listEl.innerHTML = '';
            activeKeys.forEach(key => {
                const li = document.createElement('li');
                li.className = 'premium-key-item';

                const statusBadge = key.status === 'active'
                    ? `<span class="key-status active">✅ ${escHtml(key.time_remaining) || 'Ativo'}</span>`
                    : key.status === 'unused'
                        ? '<span class="key-status unused">🔑 Não usada</span>'
                        : '<span class="key-status expired">❌ Expirada</span>';

                li.innerHTML = `
                    <span class="premium-key-value">${escHtml(key.key)}</span>
                    <span class="premium-key-type">${escHtml(key.type?.toUpperCase())}</span>
                    ${statusBadge}
                `;
                listEl.appendChild(li);
            });
        }
    }

    // ==================== SISTEMA DE 2 PASSOS (2026) ====================
    // PASSO 1: Linkvertise → valida hash → libera Passo 2
    // PASSO 2: DirectLink → challenge → key
    // =====================================================================

    // Estado do Two-Step
    const twoStepState = {
        step: parseInt(localStorage.getItem(CONFIG.TWOSTEP_CURRENT_STEP_KEY)) || 0,
        sessionId: localStorage.getItem(CONFIG.TWOSTEP_SESSION_KEY) || null,
        step1Token: localStorage.getItem(CONFIG.TWOSTEP_STEP1_TOKEN_KEY) || null
    };

    // Abre modal de 2 passos
    // [FIX 2026] Agora verifica cooldown e limite de keys ANTES de abrir
    async function openTwoStepModal(skipChecks = false) {
        if (!elements.twoStepModal) return;

        // === FIX: Verificar cooldown antes de abrir modal ===
        if (!skipChecks && appState.isInCooldown) {
            const lang = appState.currentLanguage;
            showUIMessage(translations[lang].wait_cooldown || '⏱️ Aguarde o cooldown terminar.', 'error');
            return;
        }

        // === FIX: Verificar limite de keys ANTES de abrir modal ===
        // Busca lista atualizada do servidor para evitar bypass
        if (!skipChecks) {
            try {
                const headers = discordAuth.getAuthHeaders();
                const response = await fetchWithTimeout(
                    `${CONFIG.API_BASE_URL}/user_keys`,
                    { headers },
                    CONFIG.REQUEST_TIMEOUT,
                    1
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success') {
                        appState.userKeys = data.keys || [];
                        updateKeyLimitDisplay();

                        // Verifica limite
                        if (appState.userKeys.length >= CONFIG.MAX_KEY_LIMIT) {
                            const lang = appState.currentLanguage;
                            showUIMessage(translations[lang].limit_reached || '⚠️ LIMITE: Máximo de 5 keys.', 'error');
                            return;
                        }
                    }
                }
            } catch (e) {
                console.warn('[openTwoStepModal] Erro ao verificar keys:', e);
                // Em caso de erro de rede, permite continuar (backend vai validar)
            }
        }

        // Sincroniza estado visual
        updateTwoStepUI();

        // Renderiza Turnstile no modal
        if (window.turnstile && elements.twoStepTurnstile && !elements.twoStepTurnstile.hasChildNodes()) {
            window.turnstile.render(elements.twoStepTurnstile, {
                sitekey: window.TURNSTILE_SITE_KEY || '0x4AAAAAACCiV6dd05O6ZjAs',
                theme: 'dark',
                callback: function (token) {
                    appState.turnstileToken = token;
                    appState.turnstileVerifiedAt = Date.now();
                    enableStepButtons();
                    if (elements.twoStepTurnstileHint) {
                        elements.twoStepTurnstileHint.textContent = '✅ Verificado!';
                        elements.twoStepTurnstileHint.style.color = '#00ff88';
                    }
                }
            });
        }

        elements.twoStepModal.style.display = 'block';
    }

    // Atualiza UI dos passos
    function updateTwoStepUI() {
        const step1Complete = !!twoStepState.step1Token;

        // Step 1 Card
        if (elements.stepCard1) {
            elements.stepCard1.classList.remove('current', 'completed', 'locked');
            if (step1Complete) {
                elements.stepCard1.classList.add('completed');
                if (elements.step1Status) elements.step1Status.textContent = '✅';
            } else {
                elements.stepCard1.classList.add('current');
                if (elements.step1Status) elements.step1Status.textContent = '⏳';
            }
        }

        // Step 2 Card
        if (elements.stepCard2) {
            elements.stepCard2.classList.remove('current', 'completed', 'locked');
            if (step1Complete) {
                elements.stepCard2.classList.add('current');
                if (elements.step2Status) elements.step2Status.textContent = '⏳';
                if (elements.step2LockedOverlay) elements.step2LockedOverlay.style.display = 'none';
                if (elements.btnStep2) elements.btnStep2.disabled = !appState.turnstileToken;
            } else {
                elements.stepCard2.classList.add('locked');
                if (elements.step2Status) elements.step2Status.textContent = '🔒';
                if (elements.step2LockedOverlay) elements.step2LockedOverlay.style.display = 'flex';
                if (elements.btnStep2) elements.btnStep2.disabled = true;
            }
        }

        // Step Indicators
        if (elements.stepIndicator1) {
            elements.stepIndicator1.classList.toggle('completed', step1Complete);
        }
        if (elements.stepIndicator2) {
            elements.stepIndicator2.classList.toggle('active', step1Complete);
        }
    }

    // Habilita botões após Turnstile
    function enableStepButtons() {
        const step1Complete = !!twoStepState.step1Token;
        if (elements.btnStep1) elements.btnStep1.disabled = step1Complete;
        if (elements.btnStep2) elements.btnStep2.disabled = !step1Complete;
    }

    // PASSO 1: Iniciar verificação
    async function startStep1() {
        if (appState.isProcessing) return;
        if (!appState.turnstileToken) {
            showUIMessage(translations[appState.currentLanguage].captcha_first, 'error');
            return;
        }

        const tokenAge = Date.now() - (appState.turnstileVerifiedAt || 0);
        if (tokenAge > 4 * 60 * 1000) {
            showUIMessage(translations[appState.currentLanguage].captcha_expired, 'error');
            if (window.turnstile && elements.twoStepTurnstile) {
                window.turnstile.reset(elements.twoStepTurnstile);
            }
            return;
        }

        appState.isProcessing = true;
        if (elements.btnStep1) setButtonLoading(elements.btnStep1, true);

        try {
            const lang = appState.currentLanguage;
            showUIMessage(translations[lang].starting_verification, 'info', 0);

            const response = await fetch(`${CONFIG.API_BASE_URL}/initiate-step1`, {
                method: 'GET',
                headers: {
                    'X-Turnstile-Token': appState.turnstileToken,
                    ...discordAuth.getAuthHeaders()  // [FIX] Envia credenciais de autenticação
                }
            });
            const data = await response.json();

            if (response.status === 429) {
                // [FIX] Tratar erros específicos de limite e cooldown
                if (data.limit_reached) {
                    showUIMessage(translations[lang].limit_reached || '⚠️ LIMITE: Máximo de 5 keys atingido.', 'error', 10000);
                } else if (data.cooldown_active) {
                    showUIMessage(`⏱️ Aguarde ${data.retry_after || 30} segundos.`, 'error', 5000);
                } else {
                    showUIMessage(translations[lang].challenge_blocked || 'Muitas tentativas. Aguarde.', 'error', 15000);
                }
                appState.isProcessing = false;
                if (elements.btnStep1) setButtonLoading(elements.btnStep1, false);
                // Fecha modal se limite atingido
                if (data.limit_reached && elements.twoStepModal) {
                    elements.twoStepModal.style.display = 'none';
                }
                return;
            }

            if (response.status === 401) {
                showUIMessage(translations[lang].session_expired_login, 'error');
                await discordAuth.logout();
                appState.isProcessing = false;
                if (elements.btnStep1) setButtonLoading(elements.btnStep1, false);
                return;
            }

            if (response.ok && data.status === 'success' && data.session_id) {
                // Salva sessão
                localStorage.setItem(CONFIG.TWOSTEP_SESSION_KEY, data.session_id);
                localStorage.setItem(CONFIG.TWOSTEP_CURRENT_STEP_KEY, '1');
                localStorage.setItem(CONFIG.BYPASS_STARTED_AT_KEY, Date.now().toString());
                twoStepState.sessionId = data.session_id;
                twoStepState.step = 1;

                showUIMessage(translations[lang].redirecting_portal || 'Redirecionando...', 'info', 3000);

                // Redireciona para Linkvertise
                setTimeout(() => {
                    window.location.href = CONFIG.SHORTENER_URLS.step1;
                }, 1500);
            } else {
                throw new Error(data.message || 'Erro ao iniciar verificação');
            }
        } catch (error) {
            showUIMessage(`❌ ${error.message}`, 'error');
            appState.isProcessing = false;
            if (elements.btnStep1) setButtonLoading(elements.btnStep1, false);
        }
    }

    // PASSO 2: Iniciar verificação (só após step1 validado)
    async function startStep2() {
        if (appState.isProcessing) return;
        if (!twoStepState.step1Token) {
            showUIMessage('Complete o Passo 1 primeiro!', 'error');
            return;
        }

        appState.isProcessing = true;
        if (elements.btnStep2) setButtonLoading(elements.btnStep2, true);

        try {
            const lang = appState.currentLanguage;
            showUIMessage(translations[lang].starting_verification || 'Iniciando...', 'info', 0);

            const response = await fetch(`${CONFIG.API_BASE_URL}/initiate-step2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...discordAuth.getAuthHeaders() },
                body: JSON.stringify({ step1_token: twoStepState.step1Token })
            });
            const data = await response.json();

            if (!response.ok) {
                if (data.message?.includes('expirado')) {
                    // Token expirou, resetar
                    clearTwoStepStorage();
                    showUIMessage('Sessão expirada. Comece novamente.', 'error');
                    updateTwoStepUI();
                } else {
                    throw new Error(data.message || 'Erro ao iniciar Passo 2');
                }
                appState.isProcessing = false;
                if (elements.btnStep2) setButtonLoading(elements.btnStep2, false);
                return;
            }

            if (data.status === 'success' && data.session_id) {
                localStorage.setItem(CONFIG.TWOSTEP_SESSION_KEY, data.session_id);
                localStorage.setItem(CONFIG.TWOSTEP_CURRENT_STEP_KEY, '2');
                twoStepState.sessionId = data.session_id;
                twoStepState.step = 2;

                showUIMessage(translations[lang].redirecting_portal || 'Redirecionando...', 'info', 3000);

                setTimeout(() => {
                    window.location.href = CONFIG.SHORTENER_URLS.step2;
                }, 1500);
            }
        } catch (error) {
            showUIMessage(`❌ ${error.message}`, 'error');
            appState.isProcessing = false;
            if (elements.btnStep2) setButtonLoading(elements.btnStep2, false);
        }
    }

    // Verifica retorno do encurtador (Step 1 ou Step 2)
    // ==================== TOKEN BURN PROTOCOL (FRONTEND 2026) ====================
    // CRITICAL: This function captures the Linkvertise hash token and IMMEDIATELY
    // sanitizes the URL to prevent token leakage. Success is determined ONLY by
    // backend 200 OK response, NOT by URL parameters like status=success.
    // =============================================================================
    async function checkAndProcessShortenerReturn() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            const sessionId = localStorage.getItem(CONFIG.TWOSTEP_SESSION_KEY);
            const currentStep = parseInt(localStorage.getItem(CONFIG.TWOSTEP_CURRENT_STEP_KEY)) || 0;

            // ==================================================================
            // 🔥 POLYMORPHIC TOKEN CAPTURE (ANTI-BYPASS 2026)
            // ==================================================================
            // Linkvertise may use different parameter names depending on config.
            // We capture from ALL known variants to ensure robustness.
            // ==================================================================
            const linkvertiseHash = urlParams.get('linkvertise_hash')
                || urlParams.get('hash')
                || urlParams.get('token')
                || urlParams.get('k')
                || urlParams.get('lv_token')
                || urlParams.get('t');

            // ==================================================================
            // 🛡️ STRICT REFERRER WALL (ANTI-BYPASS 2026)
            // ==================================================================
            // Bypass services (and Copy/Paste users) often have empty referrer
            // or a referrer that is not Linkvertise. We ENFORCE Whitelist.
            // ==================================================================
            const referrer = document.referrer.toLowerCase();
            const allowedReferrers = [
                'linkvertise.com', 'link-hub.net', 'link-target.net',
                'lnkload.com', 'direct-link.net', 'directlink.to',
                'crewcore.online', // Self-allowed for internal redirects
                'google.com', 'bing.com' // Allow search engines (optional, depends on flow)
            ];

            // Only enforce if we are actually processing a return action
            if (action && (linkvertiseHash || action.includes('complete'))) {
                const isTrusted = allowedReferrers.some(d => referrer.includes(d));

                // BLOCK if referrer is empty (Direct Entry/Copy-Paste) OR not trusted
                if (!referrer || !isTrusted) {
                    console.warn(`[Anti-Bypass] 🛡️ Suspicious Referrer blocked: '${referrer}' | Action: ${action}`);

                    // Show warning message instead of aggressive block
                    const modalMsg = !referrer
                        ? 'Direct access blocked (Copy/Paste). Please complete the shortener correctly.'
                        : 'Bypass detected. Please complete the shortener correctly.';
                    showUIMessage(modalMsg, 'error', 10000);

                    clearTwoStepStorage();
                    return;
                }
            }

            // Moved up for scope availability

            // ==================================================================
            // 🛡️ IMMEDIATE URL SANITIZATION
            // ==================================================================
            // Remove sensitive parameters from URL BEFORE any processing.
            // This prevents token leakage via browser history, referrer, etc.
            // ==================================================================
            if (action || linkvertiseHash) {
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log('[TOKEN-BURN] URL sanitized immediately to prevent token leakage');
            }

            console.log('[TOKEN-BURN] Checking return:', {
                action,
                hasToken: !!linkvertiseHash,
                tokenPreview: linkvertiseHash ? linkvertiseHash.substring(0, 8) + '...' : 'NONE',
                currentStep,
                hasSession: !!sessionId
            });

            if (!sessionId || !currentStep) {
                console.log('[TOKEN-BURN] No session or step found, skipping return check');
                return;
            }

            // Helper para verificar se a action corresponde (principal ou alternativa)
            const matchesStep1Action = (a) => {
                const cfg = CONFIG.RETURN_CONFIG.step1;
                return a === cfg.action || (cfg.alternativeActions && cfg.alternativeActions.includes(a));
            };
            const matchesStep2Action = (a) => {
                const cfg = CONFIG.RETURN_CONFIG.step2;
                return a === cfg.action || (cfg.alternativeActions && cfg.alternativeActions.includes(a));
            };

            // ==================================================================
            // 🔥 TOKEN BURN: Success depends on BACKEND, not URL params
            // ==================================================================
            // We no longer check status=success. This was a vulnerability.
            // The backend will validate the token and burn it atomically.
            // ==================================================================

            // Verifica retorno do STEP 1
            if (matchesStep1Action(action) && currentStep === 1) {
                console.log('[TOKEN-BURN] ✅ Step 1 return detected! Sending token to backend for validation and burn.');
                await handleStep1Return(sessionId, linkvertiseHash);
            }
            // Verifica retorno do STEP 2
            else if (matchesStep2Action(action) && currentStep === 2) {
                console.log('[TOKEN-BURN] ✅ Step 2 return detected!');
                await handleStep2Return(sessionId, linkvertiseHash);
            } else if (action) {
                console.log('[TOKEN-BURN] Action found but does not match current step:', { action, currentStep });
            }
        } catch (e) {
            console.error('[TOKEN-BURN] Error in checkAndProcessShortenerReturn:', e);
        }
    }


    // Processa retorno do Passo 1
    // [FIX 2026] Agora verifica limite de keys ANTES de continuar
    async function handleStep1Return(sessionId, linkvertiseHash) {
        const lang = appState.currentLanguage;
        showUIMessage(translations[lang].verification_processing || 'Processando...', 'info', 0);
        window.history.replaceState({}, document.title, window.location.pathname);

        // === FIX: Buscar keys ANTES de continuar para evitar bypass ===
        try {
            const headers = discordAuth.getAuthHeaders();
            const keysResponse = await fetch(`${CONFIG.API_BASE_URL}/user_keys`, { headers });
            if (keysResponse.ok) {
                const keysData = await keysResponse.json();
                if (keysData.status === 'success') {
                    appState.userKeys = keysData.keys || [];
                    updateKeyLimitDisplay();

                    // Verifica limite AGORA (antes de continuar)
                    if (appState.userKeys.length >= CONFIG.MAX_KEY_LIMIT) {
                        showUIMessage(translations[lang].limit_reached || '⚠️ LIMITE: Máximo de 5 keys atingido.', 'error');
                        clearTwoStepStorage();
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn('[handleStep1Return] Erro ao verificar keys:', e);
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/verify-step1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    linkvertise_hash: linkvertiseHash || null
                })
            });
            const data = await response.json();

            if (data.bypass_detected) {
                showUIMessage(translations[lang].challenge_bypass_detected || 'Bypass detectado!', 'error', 10000);
                clearTwoStepStorage();
                return;
            }

            if (!response.ok) {
                showUIMessage(data.message || 'Erro na verificação.', 'error');
                clearTwoStepStorage();
                return;
            }

            if (data.status === 'success' && data.step1_token) {
                // PASSO 1 COMPLETO!
                localStorage.setItem(CONFIG.TWOSTEP_STEP1_TOKEN_KEY, data.step1_token);
                twoStepState.step1Token = data.step1_token;
                twoStepState.step = 1;

                showUIMessage(translations[lang].step1_done, 'success', 5000);
                if (appState.soundEnabled) playSoundSequence([
                    { freq: 523, duration: 100, type: 'sine' },
                    { freq: 659, duration: 100, type: 'sine' },
                    { freq: 784, duration: 150, type: 'sine' }
                ]);

                // Atualiza UI e abre modal para Step 2 (skipChecks pois já verificamos)
                updateTwoStepUI();
                setTimeout(() => openTwoStepModal(true), 1000);
            }
        } catch (error) {
            console.error('[2-Step] Erro no verify-step1:', error);
            showUIMessage('Erro ao verificar. Tente novamente.', 'error');
            clearTwoStepStorage();
        }
    }

    // Processa retorno do Passo 2 (mostra challenge)
    async function handleStep2Return(sessionId, linkvertiseHash) {
        const lang = appState.currentLanguage;
        showUIMessage(translations[lang].verification_processing || 'Processando...', 'info', 0);
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/verify-step2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    linkvertise_hash: linkvertiseHash || null
                })
            });
            const data = await response.json();

            if (data.bypass_detected) {
                showUIMessage(translations[lang].challenge_bypass_detected || 'Bypass detectado!', 'error', 10000);
                clearTwoStepStorage();
                return;
            }

            if (!response.ok) {
                showUIMessage(data.message || 'Erro na verificação.', 'error');
                clearTwoStepStorage();
                return;
            }

            // Recebeu challenge
            if (data.status === 'success' && data.challenge) {
                appState.currentChallenge = {
                    ...data.challenge,
                    sessionId: sessionId,
                    timeout: data.timeout_seconds || 180,
                    isTwoStep: true  // Flag para usar rota correta
                };
                showChallengeModal(data.challenge, data.timeout_seconds);
            }
        } catch (error) {
            console.error('[2-Step] Erro no verify-step2:', error);
            showUIMessage('Erro ao verificar. Tente novamente.', 'error');
            clearTwoStepStorage();
        }
    }

    // Limpa storage do sistema 2 passos
    function clearTwoStepStorage() {
        localStorage.removeItem(CONFIG.TWOSTEP_SESSION_KEY);
        localStorage.removeItem(CONFIG.TWOSTEP_STEP1_TOKEN_KEY);
        localStorage.removeItem(CONFIG.TWOSTEP_CURRENT_STEP_KEY);
        localStorage.removeItem(CONFIG.BYPASS_STARTED_AT_KEY);
        localStorage.removeItem(CONFIG.BYPASS_PROOF_TOKEN_KEY);
        twoStepState.step = 0;
        twoStepState.sessionId = null;
        twoStepState.step1Token = null;
        appState.currentChallenge = null;
        appState.proofToken = null;
        if (appState.challengeTimerInterval) {
            clearInterval(appState.challengeTimerInterval);
            appState.challengeTimerInterval = null;
        }
    }

    // Manter compatibilidade com clearBypassStorage
    function clearBypassStorage() {
        clearTwoStepStorage();
    }

    // === CHALLENGE MODAL - User Friendly Version ===
    function showChallengeModal(challenge, timeoutSeconds = 300) {
        const lang = appState.currentLanguage;

        // Cria modal dinamicamente se não existir
        let modal = elements.challengeModal;
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'challengeModal';
            modal.className = 'modal challenge-modal';
            modal.innerHTML = `
                <div class="modal-content challenge-modal-content">
                    <div class="challenge-header">
                        <h2>🎮 ${lang === 'pt' ? 'Último Passo!' : 'Final Step!'}</h2>
                        <p style="color: #888; font-size: 0.9em;">${lang === 'pt' ? 'Responda corretamente para receber sua key' : 'Answer correctly to receive your key'}</p>
                    </div>
                    <div class="challenge-timer" style="font-size: 0.85em; color: #666;">
                        <span>⏱️</span>
                        <span id="challengeTimer">${timeoutSeconds}s</span>
                    </div>
                    <div class="challenge-body">
                        <div class="challenge-question" id="challengeQuestion"></div>
                        <div class="challenge-options" id="challengeOptions"></div>
                    </div>
                    <div class="challenge-footer">
                        <span id="challengeAttempts" style="font-size: 0.85em; color: #888;"></span>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            elements.challengeModal = modal;
            elements.challengeQuestion = document.getElementById('challengeQuestion');
            elements.challengeOptions = document.getElementById('challengeOptions');
            elements.challengeTimer = document.getElementById('challengeTimer');
            elements.challengeAttempts = document.getElementById('challengeAttempts');

            // Permite fechar clicando fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    // Suave feedback visual
                    const content = modal.querySelector('.challenge-modal-content');
                    content.style.transform = 'scale(0.98)';
                    setTimeout(() => { content.style.transform = ''; }, 150);
                }
            });
        }

        // Atualiza conteúdo do challenge
        renderChallenge(challenge);

        // Inicia timer (mais generoso - 5 minutos)
        let remaining = Math.max(timeoutSeconds, 300);
        elements.challengeTimer.textContent = formatTime(remaining);

        if (appState.challengeTimerInterval) clearInterval(appState.challengeTimerInterval);
        appState.challengeTimerInterval = setInterval(() => {
            remaining--;
            if (elements.challengeTimer) elements.challengeTimer.textContent = formatTime(remaining);

            if (remaining <= 0) {
                clearInterval(appState.challengeTimerInterval);
                hideChallengeModal();
                showUIMessage(lang === 'pt' ? '⏰ Tempo esgotado. Tente novamente!' : '⏰ Time expired. Try again!', 'info');
                clearBypassStorage();
            }
        }, 1000);

        // Mostra modal
        modal.style.display = 'block';
        if (appState.soundEnabled) playSound(660, 150, 'sine');
    }

    // Helper para formatar tempo
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    }

    // === Renderiza o challenge - Versão Simplificada ===
    function renderChallenge(challenge, attemptsRemaining = 10) {
        const lang = appState.currentLanguage;

        // Select question based on language
        const questionText = lang === 'en' ? (challenge.question_en || challenge.question) : challenge.question;

        // Split question into instruction and visual parts using || separator
        const parts = questionText.split('||');
        const instructionText = parts[0] || questionText;
        const visualContent = parts[1] || '';

        // Question - limpa e clara
        if (elements.challengeQuestion) {
            elements.challengeQuestion.innerHTML = `
                <div class="challenge-instruction" style="font-size: 1.1em; margin-bottom: 1rem; font-weight: 500; color: #e0e0e0;">${escHtml(instructionText)}</div>
                ${visualContent ? `<div class="challenge-visual" style="font-size: 2.5em; letter-spacing: 0.15em; padding: 10px;">${escHtml(visualContent)}</div>` : ''}
            `;
        }

        // Options - botões maiores e mais fáceis de clicar
        if (elements.challengeOptions) {
            elements.challengeOptions.innerHTML = '';
            elements.challengeOptions.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 15px;';

            const createButton = (content, answer, extraClass = '') => {
                const btn = document.createElement('button');
                btn.className = `challenge-option ${extraClass}`;
                btn.style.cssText = 'min-width: 60px; min-height: 50px; font-size: 1.2em; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 2px solid #444; background: #2a2a2a;';
                if (typeof content === 'object' && content.hex) {
                    btn.style.setProperty('background', content.hex, 'important');
                    btn.style.width = '60px';
                    btn.style.height = '60px';
                    btn.style.borderRadius = '50%';
                    btn.title = content.name || '';
                } else {
                    btn.textContent = content;
                    btn.style.padding = '12px 20px';
                }
                btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; btn.style.borderColor = '#00ff88'; };
                btn.onmouseleave = () => { btn.style.transform = ''; btn.style.borderColor = '#444'; };
                btn.onclick = () => submitChallengeAnswer(answer);
                return btn;
            };

            if (challenge.type === 'among_us_color' || challenge.type === 'color') {
                challenge.options.forEach(opt => {
                    elements.challengeOptions.appendChild(createButton(opt, opt.code, 'challenge-color-option'));
                });
            } else {
                challenge.options.forEach(opt => {
                    elements.challengeOptions.appendChild(createButton(opt, opt, challenge.type === 'emoji_simple' ? 'challenge-emoji-option' : ''));
                });
            }
        }

        // Attempts - mais tentativas, menos pressão
        if (elements.challengeAttempts) {
            const attemptsText = lang === 'pt' ? `Tentativas: ${attemptsRemaining}` : `Attempts: ${attemptsRemaining}`;
            elements.challengeAttempts.textContent = attemptsText;
        }
    }

    // === Envia resposta do challenge - Versão Amigável ===
    async function submitChallengeAnswer(answer) {
        const lang = appState.currentLanguage;

        if (!appState.currentChallenge) {
            showUIMessage(lang === 'pt' ? 'Erro inesperado. Tente novamente.' : 'Unexpected error. Try again.', 'error');
            return;
        }

        // Desabilita botões enquanto processa
        const optionButtons = elements.challengeOptions?.querySelectorAll('button');
        optionButtons?.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
        });

        showUIMessage(lang === 'pt' ? '⏳ Verificando...' : '⏳ Checking...', 'info', 0);

        try {
            const endpoint = appState.currentChallenge.isTwoStep
                ? '/solve-challenge-step2'
                : '/solve-challenge';

            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: appState.currentChallenge.sessionId,
                    challenge_id: appState.currentChallenge.id,
                    answer: String(answer)
                })
            });

            const data = await response.json();

            // Rate limit - mais amigável
            if (response.status === 429) {
                showUIMessage(lang === 'pt' ? '⏳ Aguarde um momento e tente novamente.' : '⏳ Please wait a moment and try again.', 'info', 5000);
                setTimeout(() => {
                    optionButtons?.forEach(btn => {
                        btn.disabled = false;
                        btn.style.opacity = '1';
                    });
                }, 3000);
                return;
            }

            // Resposta errada - novo challenge
            if (data.new_challenge) {
                const wrongMsg = lang === 'pt' ? '❌ Ops! Tente novamente.' : '❌ Oops! Try again.';
                showUIMessage(wrongMsg, 'info', 1500);
                if (appState.soundEnabled) playSound(300, 100, 'sine');

                // Atualiza challenge mantendo estado
                appState.currentChallenge = {
                    ...data.new_challenge,
                    sessionId: appState.currentChallenge.sessionId,
                    timeout: appState.currentChallenge.timeout,
                    isTwoStep: appState.currentChallenge.isTwoStep
                };

                // Pequeno delay para feedback visual
                setTimeout(() => {
                    renderChallenge(data.new_challenge, data.attempts_remaining || 10);
                }, 300);
                return;
            }

            // Precisa reiniciar - mas de forma amigável
            if (data.restart_required) {
                hideChallengeModal();
                showUIMessage(lang === 'pt' ? '🔄 Sessão expirada. Clique em START TASK novamente.' : '🔄 Session expired. Click START TASK again.', 'info', 5000);
                clearBypassStorage();
                return;
            }

            // Outros erros
            if (!response.ok && !data.proof_token) {
                showUIMessage(data.message || (lang === 'pt' ? 'Erro. Tente novamente.' : 'Error. Try again.'), 'info', 3000);
                optionButtons?.forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                });
                return;
            }

            // === SUCESSO! ===
            if (data.status === 'success' && data.proof_token) {
                hideChallengeModal();
                showUIMessage(lang === 'pt' ? '✅ Perfeito! Gerando sua key...' : '✅ Perfect! Generating your key...', 'success');
                if (appState.soundEnabled) playSoundSequence([
                    { freq: 523, duration: 80, type: 'sine' },
                    { freq: 659, duration: 80, type: 'sine' },
                    { freq: 784, duration: 120, type: 'sine' }
                ]);

                appState.proofToken = data.proof_token;
                localStorage.setItem(CONFIG.BYPASS_PROOF_TOKEN_KEY, data.proof_token);
                localStorage.removeItem(CONFIG.BYPASS_SESSION_KEY);

                // Gera key imediatamente
                setTimeout(() => generateNewKey(), 200);
            }
        } catch (error) {
            console.error('[Challenge] Erro:', error);
            showUIMessage(lang === 'pt' ? '⚠️ Erro de conexão. Tente novamente.' : '⚠️ Connection error. Try again.', 'info', 3000);
            optionButtons?.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
        }
    }

    // === ANTI-BYPASS: Esconde modal do challenge ===
    function hideChallengeModal() {
        if (elements.challengeModal) {
            elements.challengeModal.style.display = 'none';
        }
        if (appState.challengeTimerInterval) {
            clearInterval(appState.challengeTimerInterval);
            appState.challengeTimerInterval = null;
        }
    }

    function openDiscordWidget() {
        // Lazy-load iframe src on first open
        const iframe = elements.discordWidgetContainer?.querySelector('iframe[data-src]');
        if (iframe) { iframe.src = iframe.getAttribute('data-src'); iframe.removeAttribute('data-src'); }
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
        // Keys that contain HTML and need innerHTML instead of textContent
        const htmlKeys = ['footer_made_with', 'prem_social_proof'];

        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.getAttribute('data-translate-key');
            if (translations[lang][key]) {
                // Use innerHTML for keys that contain HTML tags
                if (htmlKeys.includes(key)) {
                    el.innerHTML = translations[lang][key];
                } else {
                    el.textContent = translations[lang][key];
                }
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

        // Atualiza preços baseado no novo idioma (BRL/USD)
        updatePremiumPrices();
        updateMissionPanel();
    }

    function toggleTranslation() {
        const newLang = appState.currentLanguage === 'pt' ? 'en' : 'pt';
        applyTranslation(newLang);
    }

    function setupCanvasStarfield() {
        const canvas = elements.starfieldCanvas;
        if (!canvas) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { canvas.style.display = 'none'; return; }
        const ctx = canvas.getContext('2d');
        let stars = [];
        const isMobile = window.innerWidth < 768;
        const maxStars = isMobile ? 60 : 120;
        const numStars = Math.min(maxStars, Math.floor((window.innerWidth * window.innerHeight) / 12000));
        const TARGET_FPS = isMobile ? 20 : 30;
        const FRAME_INTERVAL = 1000 / TARGET_FPS;
        let lastFrameTime = 0;
        let animationId = null;
        let isRunning = false;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            stars = [];
            const count = Math.min(maxStars, Math.floor((canvas.width * canvas.height) / 12000));
            for (let i = 0; i < count; i++) {
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

        function animate(timestamp) {
            if (!isRunning) return;
            animationId = requestAnimationFrame(animate);
            const delta = timestamp - lastFrameTime;
            if (delta < FRAME_INTERVAL) return;
            lastFrameTime = timestamp - (delta % FRAME_INTERVAL);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < stars.length; i++) {
                const star = stars[i];
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
            }
        }

        function startAnimation() { if (!isRunning) { isRunning = true; lastFrameTime = 0; animationId = requestAnimationFrame(animate); } }
        function stopAnimation() { isRunning = false; if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }

        document.addEventListener('visibilitychange', () => { document.hidden ? stopAnimation() : startAnimation(); });
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        startAnimation();
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

        // === TWO-STEP MODAL LOGIC (2026) ===
        window._twoStepTurnstileRendered = false;

        if (elements.btnOpenMethodMenu) {
            elements.btnOpenMethodMenu.addEventListener('click', async () => {
                // UX: Shake feedback on disabled button click
                if (elements.btnOpenMethodMenu.disabled) {
                    elements.btnOpenMethodMenu.classList.add('shake');
                    setTimeout(() => elements.btnOpenMethodMenu.classList.remove('shake'), 500);
                    return;
                }
                // [FIX 2026] Verificação adicional antes de abrir modal
                if (appState.isInCooldown) {
                    const lang = appState.currentLanguage;
                    showUIMessage(translations[lang].wait_cooldown || '⏱️ Aguarde o cooldown terminar.', 'error');
                    return;
                }
                await openTwoStepModal();
            });
        }

        // Close two-step modal
        if (elements.closeTwoStepModal) {
            elements.closeTwoStepModal.addEventListener('click', () => {
                if (elements.twoStepModal) elements.twoStepModal.style.display = 'none';
            });
        }
        if (elements.twoStepModal) {
            window.addEventListener('click', (e) => {
                if (e.target === elements.twoStepModal) elements.twoStepModal.style.display = 'none';
            });
        }

        // Step Buttons in Modal
        if (elements.btnStep1) {
            elements.btnStep1.addEventListener('click', () => {
                startStep1();
            });
        }
        if (elements.btnStep2) {
            elements.btnStep2.addEventListener('click', () => {
                startStep2();
            });
        }

        if (elements.btnView) elements.btnView.addEventListener('click', () => { if (appState.soundEnabled) playSound(500, 100, 'square'); fetchUserKeyList(); });
        if (elements.missionCtaBtn) elements.missionCtaBtn.addEventListener('click', handleMissionCTA);
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

        // Ripple effect on all action buttons
        document.querySelectorAll('.action-button, .plan-buy-btn, .step-btn, .modal-action-btn, .dl-trigger-btn').forEach(btn => {
            btn.addEventListener('click', addRipple);
        });

        // Initialize scroll reveal for sections
        initScrollReveal();
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

        // [NOVO] Busca configuração do servidor (Site Key)
        fetch(`${CONFIG.API_BASE_URL}/config`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.config) {
                    window.TURNSTILE_SITE_KEY = data.config.turnstile_site_key;
                    console.log('[Config] Loaded Site Key:', window.TURNSTILE_SITE_KEY);
                }
            })
            .catch(err => console.error('[Config] Failed to load server config:', err));
    }

    // Phase 3.2: Pause CSS animations on elements outside the viewport
    function setupAnimationPausing() {
        const animatedSelectors = '.premium-plan, .download-card, .mission-panel, .auth-section, .key-display-area, .welcome-flow, .site-footer';
        const animatedElements = document.querySelectorAll(animatedSelectors);
        if (!animatedElements.length || !('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
            });
        }, { rootMargin: '50px' });

        animatedElements.forEach(el => {
            el.style.animationPlayState = 'paused';
            observer.observe(el);
        });
    }

    initializeApp();
    updateSoundToggle();
    setupCanvasStarfield();
    setupAnimationPausing();
    setupEventListeners();
    discordAuth.init().then(() => {
        checkAndProcessShortenerReturn();
        if (discordAuth.isAuthenticated) {
            checkCooldownOnLoad();
            // Busca status premium (verifica se já é premium e atualiza UI)
            fetchUserPremiumStatus();
        }
    });
    setupSessionWatcher();

    // ==================== STRIPE PREMIUM CHECKOUT ====================
    const premiumSection = document.getElementById('premiumSection');
    const premiumSuccessModal = document.getElementById('premiumSuccessModal');
    const premiumLoadingModal = document.getElementById('premiumLoadingModal');
    const closePremiumModal = document.getElementById('closePremiumModal');
    const premiumCopyBtn = document.getElementById('premiumCopyBtn');

    // Função para mostrar seção premium após login
    function showPremiumSection() {
        if (premiumSection && discordAuth.isAuthenticated) {
            premiumSection.style.display = 'block';
            updatePremiumPrices();
        }
    }

    // Atualiza preços baseado no idioma (BRL ou USD)
    function updatePremiumPrices() {
        const isEnglish = appState.currentLanguage === 'en';
        const priceElements = document.querySelectorAll('.plan-price-value');

        priceElements.forEach(el => {
            const brl = parseFloat(el.dataset.priceBrl);
            const usd = parseFloat(el.dataset.priceUsd);
            const currency = el.querySelector('.currency');

            // Skip elements without valid price data or missing currency child
            if (isNaN(brl) || isNaN(usd)) return;

            if (currency) {
                // Element has a .currency child span - update it
                if (isEnglish) {
                    currency.textContent = '$';
                    if (el.childNodes.length > 0) {
                        el.childNodes[el.childNodes.length - 1].textContent = ` ${usd.toFixed(2)}`;
                    }
                } else {
                    currency.textContent = 'R$';
                    if (el.childNodes.length > 0) {
                        el.childNodes[el.childNodes.length - 1].textContent = ` ${brl.toFixed(2).replace('.', ',')}`;
                    }
                }
            } else {
                // Element doesn't have .currency child - update full text content
                if (isEnglish) {
                    el.textContent = `$ ${usd.toFixed(2)}`;
                } else {
                    el.textContent = `R$ ${brl.toFixed(2).replace('.', ',')}`;
                }
            }
        });
    }

    // Observer para mostrar premium quando usuário logar
    const authObserver = new MutationObserver(() => {
        if (discordAuth.isAuthenticated) {
            showPremiumSection();
        }
    });
    if (elements.userContent) {
        authObserver.observe(elements.userContent, { attributes: true, attributeFilter: ['style'] });
    }

    // Botões de compra (múltiplos planos)
    document.querySelectorAll('.plan-buy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // UX: Login gate — must be authenticated to buy premium
            if (!discordAuth.isAuthenticated) {
                const lang = appState.currentLanguage;
                showUIMessage(lang === 'pt' ? '🔐 Faça login com Discord antes de comprar!' : '🔐 Login with Discord before purchasing!', 'error');
                // Scroll to auth section
                if (elements.authSection) elements.authSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            const priceId = btn.dataset.priceId;
            if (!priceId || priceId.includes('AQUI')) {
                showUIMessage('⚠️ Plano em breve!', 'info');
                return;
            }

            btn.disabled = true;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span>⏳</span>';

            try {
                // Pega dados do usuário logado para associar à key premium
                const discordUsername = discordAuth.userData?.username || null;
                const discordUserId = discordAuth.userData?.id || discordAuth.userData?.userId || null;

                const response = await fetch(`${CONFIG.API_BASE_URL}/stripe/create-checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        price_id: priceId,
                        discord_username: discordUsername,
                        discord_user_id: discordUserId
                    })
                });

                const data = await response.json();

                // SECURITY: Validate Stripe checkout URL
                if (data.status === 'success' && data.checkout_url && typeof data.checkout_url === 'string' && data.checkout_url.startsWith('https://checkout.stripe.com/')) {
                    window.location.href = data.checkout_url;
                } else {
                    throw new Error(data.message || 'Erro ao criar checkout');
                }
            } catch (error) {
                console.error('Erro no checkout:', error);
                showUIMessage('❌ Erro ao iniciar pagamento.', 'error');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    });

    // Atualiza preços imediatamente após carregar a página
    updatePremiumPrices();

    // Atualiza preços quando idioma mudar (após applyTranslation)
    // Guarda referência à função original de tradução
    const originalApplyTranslation = applyTranslation;
    // Sobrescreve para adicionar atualização de preços
    window.applyTranslation = function (lang) {
        originalApplyTranslation(lang);
        updatePremiumPrices();
    };

    // Fechar modal premium
    if (closePremiumModal) {
        closePremiumModal.addEventListener('click', () => {
            premiumSuccessModal.style.display = 'none';
            // Limpa URL
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    // Copiar key premium
    if (premiumCopyBtn) {
        premiumCopyBtn.addEventListener('click', () => {
            const key = document.getElementById('premiumKeyValue').textContent;
            navigator.clipboard.writeText(key).then(() => {
                premiumCopyBtn.textContent = '✅ COPIADO!';
                premiumCopyBtn.classList.add('copied');
                setTimeout(() => {
                    premiumCopyBtn.textContent = '📋 COPIAR CHAVE';
                    premiumCopyBtn.classList.remove('copied');
                }, 2000);
            });
        });
    }

    // Verificar se veio de um checkout do Stripe
    async function checkStripePayment() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (!sessionId) return;

        // Mostra loading
        if (premiumLoadingModal) premiumLoadingModal.style.display = 'flex';

        let attempts = 0;
        const maxAttempts = 15;

        async function tryVerify() {
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/stripe/verify-payment?session_id=${sessionId}`);
                const data = await response.json();

                if (data.status === 'success' && data.key) {
                    // Sucesso! Mostra a key
                    if (premiumLoadingModal) premiumLoadingModal.style.display = 'none';
                    if (premiumSuccessModal) {
                        document.getElementById('premiumKeyValue').textContent = data.key;
                        document.getElementById('premiumKeyType').textContent = `Premium ${data.hours}h`;
                        premiumSuccessModal.style.display = 'flex';
                    }
                    // Limpa URL mantendo a key visível
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (data.status === 'processing' || data.status === 'pending') {
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(tryVerify, 2000);
                    } else {
                        if (premiumLoadingModal) premiumLoadingModal.style.display = 'none';
                        showUIMessage('⏳ Pagamento em processamento. Atualize a página em alguns minutos.', 'info');
                    }
                } else {
                    if (premiumLoadingModal) premiumLoadingModal.style.display = 'none';
                    showUIMessage(data.message || '❌ Erro ao verificar pagamento.', 'error');
                }
            } catch (error) {
                console.error('Erro ao verificar pagamento:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(tryVerify, 2000);
                } else {
                    if (premiumLoadingModal) premiumLoadingModal.style.display = 'none';
                    showUIMessage('❌ Erro de conexão. Tente atualizar a página.', 'error');
                }
            }
        }

        tryVerify();
    }

    // Verifica pagamento ao carregar a página
    checkStripePayment();

    setTimeout(() => {
        if (appState.soundEnabled) {
            playSoundSequence([{ freq: 220, duration: 100, type: 'sine' }, { freq: 277, duration: 100, type: 'sine' }, { freq: 330, duration: 100, type: 'sine' }, { freq: 440, duration: 200, type: 'sine' }]);
        }
    }, 1000);
});

// ==================== DOWNLOAD TURNSTILE CALLBACKS ====================
window._downloadTurnstileToken = null;
window._downloadTurnstileVerifiedAt = null;

window.onDownloadTurnstileSuccess = function (token) {
    console.log('[Download Turnstile] ✅ Verification successful');
    window._downloadTurnstileToken = token;
    window._downloadTurnstileVerifiedAt = Date.now();

    // Enable download buttons
    const steamBtn = document.getElementById('downloadSteamBtn');
    const epicBtn = document.getElementById('downloadEpicBtn');

    if (steamBtn) {
        steamBtn.disabled = false;
        steamBtn.style.opacity = '1';
        steamBtn.style.pointerEvents = 'auto';
    }
    if (epicBtn) {
        epicBtn.disabled = false;
        epicBtn.style.opacity = '1';
        epicBtn.style.pointerEvents = 'auto';
    }

    // Update hint
    const hint = document.getElementById('downloadTurnstileHint');
    if (hint) {
        hint.textContent = '✅ Verificado! Selecione a plataforma abaixo';
        hint.style.color = '#4CAF50';
    }
};

window.onDownloadTurnstileError = function () {
    console.error('[Download Turnstile] ❌ Verification failed');
    window._downloadTurnstileToken = null;

    const hint = document.getElementById('downloadTurnstileHint');
    if (hint) {
        hint.textContent = '❌ Erro na verificação. Tente recarregar a página.';
        hint.style.color = '#f44336';
    }
};

window.onDownloadTurnstileExpired = function () {
    console.warn('[Download Turnstile] ⚠️ Token expired');
    window._downloadTurnstileToken = null;

    // Disable download buttons
    const steamBtn = document.getElementById('downloadSteamBtn');
    const epicBtn = document.getElementById('downloadEpicBtn');

    if (steamBtn) {
        steamBtn.disabled = true;
        steamBtn.style.opacity = '0.5';
        steamBtn.style.pointerEvents = 'none';
    }
    if (epicBtn) {
        epicBtn.disabled = true;
        epicBtn.style.opacity = '0.5';
        epicBtn.style.pointerEvents = 'none';
    }

    // Reset hint
    const hint = document.getElementById('downloadTurnstileHint');
    if (hint) {
        hint.textContent = '⚠️ Verificação expirada. Complete novamente.';
        hint.style.color = '#ff9800';
    }

    // Reset the widget
    if (window.turnstile) {
        const widget = document.getElementById('downloadTurnstile');
        if (widget) window.turnstile.reset(widget);
    }
};

// ==================== DIRECT DOWNLOAD HANDLER ====================
// Downloads with Turnstile verification for anti-bot protection
async function handleDownload(platform) {
    const btn = document.getElementById(platform === 'steam' ? 'downloadSteamBtn' : 'downloadEpicBtn');
    const originalContent = btn ? btn.innerHTML : '';

    // === ANTI-BOT: Require Turnstile token ===
    if (!window._downloadTurnstileToken) {
        if (typeof showUIMessage === 'function') {
            showUIMessage('🔒 Complete a verificação Cloudflare primeiro!', 'error');
        } else {
            alert('🔒 Complete a verificação Cloudflare primeiro!');
        }
        return;
    }

    // Mapeamento de plataforma para arquivo no R2
    const DOWNLOAD_FILES = {
        'steam': 'Steam V6.0.6d.zip',
        'epic': 'EpicGames V6.0.6d.zip',
        'epicgames': 'EpicGames V6.0.6d.zip'
    };

    const fileName = DOWNLOAD_FILES[platform];
    if (!fileName) {
        console.error('Platform inválida:', platform);
        if (typeof showUIMessage === 'function') {
            showUIMessage('❌ Plataforma inválida', 'error');
        }
        return;
    }

    try {
        // Show loading state
        if (btn) {
            btn.disabled = true;
            btn.classList.add('loading');
            const actionEl = btn.querySelector('.dl-platform-action');
            if (actionEl) { actionEl.dataset.origHtml = actionEl.innerHTML; actionEl.innerHTML = '<span>⏳</span>'; }
        }

        // === ANTI-BOT: Verify token on server before allowing download ===
        const apiUrl = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'https://api.crewcore.online';

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        console.log(`[Download] Requesting presigned URL for ${platform}...`);
        console.log(`[Download] Token present: ${!!window._downloadTurnstileToken}`);

        let verifyResponse;
        try {
            verifyResponse = await fetch(`${apiUrl}/api/download/${platform}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Turnstile-Token': window._downloadTurnstileToken
                },
                signal: controller.signal
            });
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Timeout - servidor não respondeu. Tente novamente.');
            }
            throw new Error('Erro de conexão com o servidor.');
        }

        clearTimeout(timeoutId);

        console.log(`[Download] Response status: ${verifyResponse.status}`);

        if (!verifyResponse.ok) {
            const errorText = await verifyResponse.text();
            console.error(`[Download] Server error: ${errorText}`);
            throw new Error(`Erro do servidor (${verifyResponse.status})`);
        }

        const verifyData = await verifyResponse.json();
        console.log(`[Download] Response data:`, verifyData);

        if (verifyData.status !== 'success') {
            throw new Error(verifyData.message || 'Verificação falhou');
        }

        // Use signed URL from server (more secure) or direct R2 link
        // SECURITY: Validate download URL domain
        // Cache-bust: append timestamp to avoid Cloudflare CDN serving stale files
        const cacheBuster = `cb=${Date.now()}`;
        const rawUrl = verifyData.url || `https://mira.crewcore.online/${fileName}`;
        const downloadUrl = rawUrl.includes('?') ? `${rawUrl}&${cacheBuster}` : `${rawUrl}?${cacheBuster}`;
        if (typeof downloadUrl === 'string' && /^https:\/\/(api\.crewcore\.online|mira\.crewcore\.online|[\w-]+\.r2\.cloudflarestorage\.com)\//i.test(downloadUrl)) {
            window.location.href = downloadUrl;
        } else {
            console.error('[Download] Blocked untrusted URL:', downloadUrl);
            throw new Error('Download URL inválida');
        }

        console.log(`📥 [Download] Starting download for ${platform}: ${fileName}`);

        // Update flow guide to 'downloaded' state
        if (window.updateFlowGuide) window.updateFlowGuide('downloaded');

        // Reset button state after a short delay
        setTimeout(() => {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('loading');
                const actionEl = btn.querySelector('.dl-platform-action');
                if (actionEl && actionEl.dataset.origHtml) actionEl.innerHTML = actionEl.dataset.origHtml;
            }
        }, 2000);

    } catch (error) {
        console.error('Download error:', error);

        // Reset button and show error
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('loading');
            const actionEl = btn.querySelector('.dl-platform-action');
            if (actionEl) {
                actionEl.innerHTML = '<span>❌</span>';
                // Restore original after 2s
                setTimeout(() => {
                    if (actionEl.dataset.origHtml) actionEl.innerHTML = actionEl.dataset.origHtml;
                }, 2000);
            }
        }

        // Show error message
        if (typeof showUIMessage === 'function') {
            showUIMessage(`❌ ${error.message || 'Erro ao iniciar download'}`, 'error');
        } else {
            alert(`❌ ${error.message || 'Erro ao iniciar download'}`);
        }
    }
}

// ==================== DOWNLOAD MODAL FUNCTIONS ====================
// Track if download turnstile has been rendered
window._downloadTurnstileRendered = false;

function openDownloadModal() {
    const overlay = document.getElementById('downloadModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // === FIX: Render Turnstile widget manually when modal opens ===
        // Widgets inside hidden elements don't auto-render
        if (window.turnstile && !window._downloadTurnstileRendered) {
            const container = document.getElementById('downloadTurnstile');
            if (container) {
                // Clear any existing widget
                container.innerHTML = '';

                // Render the widget
                window.turnstile.render(container, {
                    sitekey: window.TURNSTILE_SITE_KEY || '0x4AAAAAACCiV6dd05O6ZjAs',
                    callback: window.onDownloadTurnstileSuccess,
                    'error-callback': window.onDownloadTurnstileError,
                    'expired-callback': window.onDownloadTurnstileExpired,
                    theme: 'dark',
                    retry: 'auto',
                    'retry-interval': 3000
                });

                window._downloadTurnstileRendered = true;
                console.log('[Download Turnstile] Widget rendered manually');
            }
        } else if (window._downloadTurnstileToken) {
            // If already verified, ensure buttons are enabled
            const steamBtn = document.getElementById('downloadSteamBtn');
            const epicBtn = document.getElementById('downloadEpicBtn');
            if (steamBtn) steamBtn.disabled = false;
            if (epicBtn) epicBtn.disabled = false;
        }
    }
}

function closeDownloadModal(event) {
    // If called with event, only close if clicking the overlay itself
    if (event && event.target !== event.currentTarget) return;

    const overlay = document.getElementById('downloadModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDownloadModal();
});

// ==================== PREMIUM USER PANEL ====================
const premiumPanelElements = {
    panel: document.getElementById('premiumUserPanel'),
    activeKey: document.getElementById('premiumActiveKey'),
    planType: document.getElementById('premiumPlanType'),
    expiresAt: document.getElementById('premiumExpiresAt'),
    hwidStatus: document.getElementById('premiumHwidStatus'),
    resetBtn: document.getElementById('resetHwidBtn'),
    cooldownText: document.getElementById('hwidResetCooldown'),
    hint: document.getElementById('premiumPanelHint')
};

let currentPremiumKey = null;

async function loadPremiumPanel() {
    if (!premiumPanelElements.panel) return;

    try {
        // Use cached data from fetchUserPremiumStatus() if available
        // This avoids a duplicate /user_premium_keys request on every page load
        let data = window._premiumKeysData || null;

        if (!data) {
            const sessionId = localStorage.getItem('crewbot_session');
            if (!sessionId) {
                premiumPanelElements.panel.style.display = 'none';
                return;
            }

            const apiUrl = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'https://api.crewcore.online';
            const response = await fetch(`${apiUrl}/user_premium_keys`, {
                headers: { 'X-Session-ID': sessionId }
            });

            if (!response.ok) {
                premiumPanelElements.panel.style.display = 'none';
                return;
            }

            data = await response.json();
        }

        if (!data.has_active_premium || !data.premium_keys || data.premium_keys.length === 0) {
            premiumPanelElements.panel.style.display = 'none';
            return;
        }

        const activeKey = data.premium_keys.find(k => k.status === 'active');
        if (!activeKey) {
            premiumPanelElements.panel.style.display = 'none';
            return;
        }

        currentPremiumKey = activeKey.key;
        if (premiumPanelElements.activeKey) premiumPanelElements.activeKey.textContent = activeKey.key;
        if (premiumPanelElements.planType) premiumPanelElements.planType.textContent = getPlanDisplayName(activeKey.type);
        if (premiumPanelElements.expiresAt) premiumPanelElements.expiresAt.textContent = activeKey.time_remaining || 'Lifetime';

        await updateKeyStatus(activeKey.key);
        premiumPanelElements.panel.style.display = 'block';


    } catch (error) {
        console.error('[PremiumPanel] Error:', error);
        premiumPanelElements.panel.style.display = 'none';
    }
}

function getPlanDisplayName(type) {
    const names = {
        'daily': '⭐ 48 Horas',
        'weekly': '⭐ 7 Dias',
        'monthly': '⭐ 30 Dias',
        'quarterly': '⭐ 90 Dias',
        'yearly': '⭐ 365 Dias',
        'lifetime': '👑 Lifetime'
    };
    return names[type] || '⭐ Premium';
}

async function updateKeyStatus(key) {
    try {
        const apiUrl = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'https://api.crewcore.online';
        const sessionId = localStorage.getItem('crewbot_session');
        const headers = sessionId ? { 'X-Session-ID': sessionId } : {};
        const response = await fetch(`${apiUrl}/key-status?key=${encodeURIComponent(key)}`, { headers });
        if (!response.ok) return;
        const data = await response.json();

        if (data.status === 'success') {
            if (premiumPanelElements.hwidStatus) {
                premiumPanelElements.hwidStatus.textContent = data.hwid_bound ? '🔒 Vinculado' : '🔓 Não vinculado';
            }

            if (data.can_reset_hwid) {
                if (premiumPanelElements.cooldownText) premiumPanelElements.cooldownText.textContent = '1x por dia';
                if (premiumPanelElements.resetBtn) premiumPanelElements.resetBtn.disabled = false;
            } else {
                const nextReset = new Date(data.next_reset_at);
                const hoursRemaining = Math.ceil((nextReset - new Date()) / (1000 * 60 * 60));
                if (premiumPanelElements.cooldownText) premiumPanelElements.cooldownText.textContent = `Disponível em ${hoursRemaining}h`;
                if (premiumPanelElements.resetBtn) premiumPanelElements.resetBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error('[KeyStatus] Error:', error);
    }
}


async function resetHwid() {
    if (!currentPremiumKey || !premiumPanelElements.resetBtn) return;

    const originalContent = premiumPanelElements.resetBtn.innerHTML;

    try {
        premiumPanelElements.resetBtn.disabled = true;
        premiumPanelElements.resetBtn.innerHTML = '<span class="spinner"></span> Resetando...';

        const sessionId = localStorage.getItem('crewbot_session');
        if (!sessionId) throw new Error('Sessão expirada.');

        const apiUrl = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'https://api.crewcore.online';
        const response = await fetch(`${apiUrl}/premium/reset-hwid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
            body: JSON.stringify({ key: currentPremiumKey })
        });

        const data = await response.json();

        if (data.status === 'success') {
            if (typeof showUIMessage === 'function') showUIMessage('✅ ' + data.message, 'success');
            if (premiumPanelElements.hwidStatus) premiumPanelElements.hwidStatus.textContent = '🔓 Não vinculado';
            if (data.next_reset_at) {
                const hoursRemaining = Math.ceil((new Date(data.next_reset_at) - new Date()) / (1000 * 60 * 60));
                if (premiumPanelElements.cooldownText) premiumPanelElements.cooldownText.textContent = `Disponível em ${hoursRemaining}h`;
                if (premiumPanelElements.resetBtn) premiumPanelElements.resetBtn.disabled = true;
            }
        } else {
            if (typeof showUIMessage === 'function') showUIMessage('❌ ' + data.message, 'error');
            if (data.next_reset_at) {
                const hoursRemaining = Math.ceil((new Date(data.next_reset_at) - new Date()) / (1000 * 60 * 60));
                if (premiumPanelElements.cooldownText) premiumPanelElements.cooldownText.textContent = `Disponível em ${hoursRemaining}h`;
            }
        }
    } catch (error) {
        console.error('[ResetHwid] Error:', error);
        if (typeof showUIMessage === 'function') showUIMessage('❌ Erro ao resetar HWID', 'error');
    } finally {
        if (premiumPanelElements.resetBtn) premiumPanelElements.resetBtn.innerHTML = originalContent;
    }
}


if (premiumPanelElements.resetBtn) {
    premiumPanelElements.resetBtn.addEventListener('click', resetHwid);
}

document.addEventListener('DOMContentLoaded', () => setTimeout(loadPremiumPanel, 1500));
