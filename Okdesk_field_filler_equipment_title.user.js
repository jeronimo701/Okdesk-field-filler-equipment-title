// ==UserScript==
// @name         Okdesk: шаблоны и префикс оборудования в теме
// @namespace    https://shtrih-m.okdesk.ru/
// @version      1.7.60
// @description  Поля заявки, шаблоны, статусы, передача ответственного и префикс оборудования в теме через Okdesk API.
// @match        https://okdesk.ru/*
// @match        https://*.okdesk.ru/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// @author       Jeronimo701
// @license      LicenseRef-Jeronimo701-Personal-Use-1.0
// @updateURL    https://gist.githubusercontent.com/jeronimo701/6f14c6febdf0859a9b95e2e8b3af6896/raw/Okdesk_field_filler_equipment_title.user.js
// @downloadURL  https://gist.githubusercontent.com/jeronimo701/6f14c6febdf0859a9b95e2e8b3af6896/raw/Okdesk_field_filler_equipment_title.user.js
// ==/UserScript==

(function () {
    'use strict';

    const API_TOKEN_KEY = `okdesk_api_token_${location.host}`;
    const LEGACY_API_TOKEN_KEY = 'okdesk_api_token';
    const FIELD = {
        serialNumber: '008',
        warranty: '0019',
        sparePartCode: '0020',
    };
    const RELOAD_AFTER_UPDATE_KEY = `reload_after_update_${location.host}`;
    const SCRIPT_THEME_KEY = `okdesk_script_theme_${location.host}`;
    const MOBILE_VIEW_KEY = `okdesk_mobile_view_${location.host}`;
    const MOBILE_TABS_KEY = `okdesk_mobile_tabs_${location.host}`;
    const MOBILE_GROUP_ID_KEY = `okdesk_mobile_group_id_${location.host}`;
    const MOBILE_ACTIVE_TAB_KEY = `okdesk_mobile_active_tab_${location.host}`;
    const ISSUE_LIST_MANUAL_OPEN_KEY = `issue_list_manual_open_${location.host}`;
    const INTERNAL_EMAIL_DOMAINS_KEY = `internal_email_domains_${location.host}`;
    const EMAIL_DOMAIN_TITLE_RULES_KEY = `email_domain_title_rules_${location.host}`;
    const TITLE_NORMALIZATION_SKIP_PREFIX_KEY = `title_normalization_skip_prefix_${location.host}`;
    const TITLE_NORMALIZATION_ENABLED_KEY = `title_normalization_enabled_${location.host}`;
    const TITLE_NORMALIZATION_ONLY_ASSIGNED_KEY = `title_normalization_only_assigned_${location.host}`;
    const TITLE_NORMALIZATION_ONCE_KEY = `title_normalization_once_${location.host}`;
    const TITLE_NORMALIZATION_DONE_KEY = `title_normalization_done_${location.host}`;
    const DEFAULT_EMAIL_DOMAIN_TITLE_RULES = [{ domain: 'poscenter.ru', label: 'от сотрудника' }];
    const TEMPLATES_KEY = `comment_templates_${location.host}`;
    const TEMPLATE_USAGE_KEY = `comment_template_usage_${location.host}`;
    const TEMPLATE_SETTINGS_TAB_KEY = `comment_templates_settings_tab_${location.host}`;
    const TEMPLATES_VERSION_KEY = `comment_templates_version_${location.host}`;
    const TEMPLATES_VERSION = 5;
    const TRANSFER_SETTINGS_KEY = `transfer_settings_${location.host}`;
    const QUICK_REPLIES_KEY = `quick_replies_${location.host}`;
    const QUICK_REPLIES_VERSION_KEY = `quick_replies_version_${location.host}`;
    const QUICK_REPLY_PANEL_POSITION_KEY = `quick_reply_panel_position_${location.host}`;
    const QUICK_REPLIES_VERSION = 1;
    const DEFAULT_QUICK_REPLY_PANEL_POSITION = 'after-description';
    const QUICK_REPLY_COLORS = ['#3f8f72', '#3e78a5', '#8065aa', '#ad6b45', '#a85a63', '#75845a'];
    const TEMPLATE_EMOJI_GROUPS = [
        { label: 'Оборудование', items: [
            ['📷', 'Сканер'], ['🖥️', 'Моноблок'], ['📺', 'Дисплей покупателя'], ['⌨️', 'Клавиатура'],
            ['🖨️', 'Принтер'], ['🧾', 'ККТ'], ['🖱️', 'Периферия'], ['💳', 'Считыватель карт'],
        ] },
        { label: 'Сервис и ЗИП', items: [
            ['🧩', 'ЗИП'], ['🔧', 'Ремонт'], ['⚙️', 'Настройка'], ['🔌', 'Питание'],
            ['🔋', 'Аккумулятор'], ['📶', 'Сеть и Wi-Fi'], ['🛡️', 'Гарантия'], ['📦', 'Комплектация'],
            ['🛠️', 'Сервисный центр'], ['🔍', 'Проверка'], ['🔎', 'Диагностика'], ['🏢', 'АСЦ'],
        ] },
        { label: 'Информация', items: [
            ['💿', 'Софт и ОС'], ['💾', 'Прошивка и файлы'], ['🔄', 'Обновление'], ['📄', 'Документ'],
            ['🎥', 'Видео'], ['⚠️', 'Ошибка'], ['✅', 'Решение'], ['❓', 'Вопрос'], ['💻', 'ПО'],
        ] },
        { label: 'Работа с заявкой', items: [
            ['⏳', 'Ожидание'], ['📝', 'Заявка'], ['📥', 'Запрос данных'], ['🔢', 'Серийный номер'],
            ['👥', 'Сотрудники'], ['🤝', 'Направление'], ['🚫', 'Не наше'], ['👋', 'Приветствие'],
        ] },
    ];
    const ISSUE_STATUSES_KEY = `issue_statuses_${location.host}`;
    const DEFAULT_ISSUE_STATUSES = [
        { code: 'MoreDetails', name: 'Ожидание ответа' },
        { code: 'completed', name: 'Решена' },
        { code: 'closed', name: 'Закрыта' },
    ];
    const DEFAULT_TRANSFER_SETTINGS = {
        authorId: null,
        authorMode: 'auto',
        groupId: null,
        employees: [],
    };
    const DEFAULT_TEMPLATES = [
        { title: '🔄 Статус заявки', children: [
            { title: '❓ Актуальность', text: 'Вопрос по-прежнему актуален? Если да, просьба дать ответ на вопрос из комментария ниже. В ином случае переведём заявку в статус «Решена».' },
            { title: '✅ Решена', text: 'Если дополнительных вопросов по заявке нет, переведём её в статус «Решена». При необходимости, пожалуйста, оставьте комментарий.' },
            { title: '⏳ Ожидание', text: 'Вопрос находится в работе. Просьба ожидать, сообщим результат после уточнения информации.' },
        ] },
        { title: '🧩 ЗИП и диагностика', children: [
            { title: '📷 Фото узла', text: 'Для подбора ЗИП просьба предоставить фото неисправного узла с двух сторон, а также фото разъёмов и маркировок.' },
            { title: '🔍 Проверка перед ЗИП', text: 'Перед подбором ЗИП необходимо провести диагностику и подтвердить неисправность конкретного узла. Просьба приложить результаты проверок и фото оборудования с S/N.' },
            { title: '💿 Переустановка ОС через Acronis', text: 'Для исключения влияния программной части рекомендуем выполнить переустановку ОС с использованием Acronis-образа и загрузочного Live CD по инструкции: https://teletype.in/@jeronimo701/sozdanie-i-vosstanovlenie-cherez-Akronis-04-19\n\nПросьба внимательно выполнить все шаги инструкции. После переустановки проверьте, сохраняется ли неисправность на установленной системе.' },
        ] },
        { title: '📥 Запрос данных', children: [
            { title: '🔢 S/N, фото и ИНН', text: 'Прошу предоставить S/N оборудования, фото шильдика и ИНН организации, от имени которой направлено обращение.' },
            { title: '🎥 Фото или видео', text: 'Пожалуйста, приложите фото/видео проявления неисправности, а также скриншоты ошибок при их наличии.' },
            { title: '📝 Неполная заявка', text: 'Для корректной и оперативной обработки обращения просим дополнить заявку необходимой информацией.\n\nПожалуйста, укажите:\n• модель оборудования;\n• серийный номер устройства;\n• подробное описание неисправности и условия её проявления;\n• когда и после каких действий проблема появилась;\n• какие проверки уже были выполнены;\n• фото/видео проявления и скриншоты ошибок;\n• версии ПО, драйверов и ОС, если вопрос связан с программной частью.\n\nПосле получения данных продолжим работу по обращению.' },
        ] },
        { title: '🛡️ Гарантия', children: [
            { title: '🔎 Диагностика АСЦ', text: 'Просьба провести диагностику оборудования, проверить отсутствие следов залития, механических повреждений, постороннего вмешательства и иных исключений из гарантийных условий. По результату направьте заключение с подтверждением неисправного узла.' },
            { title: '🏢 Не АСЦ', text: 'Самостоятельная разборка и ремонт оборудования не рекомендуются. Для диагностики и ремонта просьба обратиться в авторизованный сервисный центр: https://optposcenter.ru/service/' },
            { title: '📄 Условия гарантии', text: 'Вопрос о гарантийности рассматривается после диагностики и проверки соблюдения условий гарантии изготовителя. Просьба предоставить результаты диагностики и необходимые фото.' },
            { title: '🔌 Внешний БП не по гарантии', text: 'БП не предоставляется по гарантии.\n\nп. 7 гарантий изготовителя.\n\nВнешний блок питания является отдельным комплектующим и не относится непосредственно к составу основного оборудования.\n\nОн относится к расходным/сменным внешним компонентам и подвержен отдельному эксплуатационному износу. Неисправность внешнего БП часто может быть вызвана внешними факторами: скачками напряжения, качеством электросети, перегрузкой, использованием несовместимого оборудования.\n\nhttps://help.kkm.solutions/' },
        ] },
        { title: '🤝 Направление', children: [
            { title: '🛠️ В АСЦ', text: 'Мы можем предоставить консультацию в рамках заявки. Для ремонта, настройки или диагностики на месте просьба обратиться в ближайший авторизованный сервисный центр: https://optposcenter.ru/service/' },
            { title: '👥 К региональному менеджеру', text: 'Подбор оборудования, коммерческие вопросы, замена по причинам совместимости и условия поставки находятся в компетенции регионального менеджера. Контакты: https://optposcenter.ru/contacts/' },
            { title: '💻 По стороннему ПО', text: 'Оборудование работает как стандартное устройство Windows после установки штатного драйвера. По настройке стороннего ПО просьба обратиться к его поставщику, в ваш IT-отдел либо в авторизованный сервисный центр: https://optposcenter.ru/service/' },
            { title: '🚫 Не наше оборудование', text: 'Указанное оборудование не относится к продукции POScenter и не поставляется нашей компанией как дистрибьютором. По вопросам диагностики, настройки, ремонта и совместимости просьба обратиться к производителю оборудования, его поставщику или в авторизованный сервисный центр данного бренда.' },
        ] },
    ];
    const DEFAULT_QUICK_REPLIES = [
        {
            standardKey: 'relevance', title: '❓ Актуальность', statusCode: 'MoreDetails', public: true, color: '#3e78a5',
            text: 'Вопрос по-прежнему актуален? Если да, просьба дать ответ на вопрос из комментария ниже. В ином случае переведём заявку в статус «Решена».',
        },
        {
            standardKey: 'waiting', title: '⏳ Ожидание', statusCode: 'MoreDetails', public: true, color: '#ad6b45',
            text: 'Вопрос находится в работе. Просьба ожидать, сообщим результат после уточнения информации.',
        },
        {
            standardKey: 'incomplete', title: '📝 Неполная заявка', statusCode: 'MoreDetails', public: true, color: '#8065aa',
            text: 'Для корректной и оперативной обработки обращения просим дополнить заявку необходимой информацией.\n\nПожалуйста, укажите:\n• модель оборудования;\n• серийный номер устройства;\n• подробное описание неисправности и условия её проявления;\n• когда и после каких действий проблема появилась;\n• какие проверки уже были выполнены;\n• фото/видео проявления и скриншоты ошибок;\n• версии ПО, драйверов и ОС, если вопрос связан с программной частью.\n\nПосле получения данных продолжим работу по обращению.',
        },
        {
            standardKey: 'service-center', title: '🛠️ В АСЦ', statusCode: 'MoreDetails', public: true, color: '#3f8f72',
            text: 'Мы можем предоставить консультацию в рамках заявки. Для ремонта, настройки или диагностики на месте просьба обратиться в ближайший авторизованный сервисный центр: https://optposcenter.ru/service/',
        },
    ];
    let menu;
    let sendHint;
    let pendingStatusChange = false;
    let queuedStatusCode = '';
    let videoAttachmentIssueId = null;
    let videoAttachments = new Map();
    let attachmentLinkFiles = new Map();
    let videoScanTimer;
    let videoLoadPromise = null;
    let templateMenu;
    let templateEmojiPicker;
    let transferEmployeesCache = null;
    let tokenOwnerCache = null;
    let quickReplyInFlight = false;
    let issueListPreview = null;
    let floatingQuickReplyPanelListenerInstalled = false;
    let equipmentTitleNormalizationIssueId = null;
    let equipmentTitleNormalizationInFlight = false;
    let equipmentTitleNormalizationAttempts = 0;
    let equipmentTitleNormalizationCompleted = false;
    let equipmentTitleNormalizationRetryAt = 0;

    const themeStyle = document.createElement('style');
    themeStyle.textContent = `
        :root {
            --okdesk-script-surface:#1d2630; --okdesk-script-raised:#26323f;
            --okdesk-script-field:#17212b; --okdesk-script-search:#141c24; --okdesk-script-tooltip:#101820;
            --okdesk-script-text:#fff; --okdesk-script-muted:#aebdca; --okdesk-script-muted-soft:#b8c7d6;
            --okdesk-script-border:#536578; --okdesk-script-border-menu:#5c6a7a; --okdesk-script-border-input:#596a7a;
            --okdesk-script-border-soft:#435264; --okdesk-script-border-panel:#415164; --okdesk-script-border-card:#405263;
            --okdesk-script-border-muted:#3b4652; --okdesk-script-divider:#4b5662;
            --okdesk-script-primary:#287154; --okdesk-script-primary-alt:#245a4d; --okdesk-script-primary-alt2:#356b45;
            --okdesk-script-secondary:#315d8b; --okdesk-script-highlight:#2d6cdf; --okdesk-script-selected:#24453f;
            --okdesk-script-success-bg:#19382f; --okdesk-script-success-text:#e0f5eb;
            --okdesk-script-danger:#ffb4ab; --okdesk-script-link:#b9e2f5;
        }
        :root[data-okdesk-script-theme="light"] {
            --okdesk-script-surface:#fff; --okdesk-script-raised:#f1f5f6;
            --okdesk-script-field:#f8fafb; --okdesk-script-search:#f8fafb; --okdesk-script-tooltip:#f1f5f6;
            --okdesk-script-text:#243238; --okdesk-script-muted:#5d6d72; --okdesk-script-muted-soft:#5d6d72;
            --okdesk-script-border:#c6d2d6; --okdesk-script-border-menu:#c6d2d6; --okdesk-script-border-input:#b8c9ce;
            --okdesk-script-border-soft:#d4dee1; --okdesk-script-border-panel:#c6d2d6; --okdesk-script-border-card:#d4dee1;
            --okdesk-script-border-muted:#d4dee1; --okdesk-script-divider:#d4dee1;
            --okdesk-script-primary:#d9efe5; --okdesk-script-primary-alt:#d9efe5; --okdesk-script-primary-alt2:#d9efe5;
            --okdesk-script-secondary:#e3eef8; --okdesk-script-highlight:#dcebf9; --okdesk-script-selected:#e5f2eb;
            --okdesk-script-success-bg:#e5f4ec; --okdesk-script-success-text:#265b43;
            --okdesk-script-danger:#a33535; --okdesk-script-link:#17677f;
        }
        :root[data-okdesk-script-theme="light"] :is(#okdesk-settings-dialog, #okdesk-quick-replies-panel, #okdesk-field-filler-menu, #okdesk-template-menu, [data-okdesk-script-ui="true"]) { color-scheme:light; }
        :root[data-okdesk-script-theme="dark"] :is(#okdesk-settings-dialog, #okdesk-quick-replies-panel, #okdesk-field-filler-menu, #okdesk-template-menu, [data-okdesk-script-ui="true"]) { color-scheme:dark; }
    `;
    document.head.appendChild(themeStyle);

    function detectOkdeskTheme() {
        const marker = [document.documentElement, document.body].filter(Boolean)
            .map((node) => `${node.className || ''} ${node.getAttribute('data-theme') || ''}`.toLowerCase()).join(' ');
        if (/(?:^|\s|-)dark(?:\s|$|-)/.test(marker)) return 'dark';
        if (/(?:^|\s|-)light(?:\s|$|-)/.test(marker)) return 'light';
        for (const node of [document.body, document.documentElement]) {
            if (!node) continue;
            const match = getComputedStyle(node).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (!match || Number(match[4] ?? 1) < 0.1) continue;
            const brightness = Number(match[1]) * 0.2126 + Number(match[2]) * 0.7152 + Number(match[3]) * 0.0722;
            return brightness < 150 ? 'dark' : 'light';
        }
        if (document.body) {
            const match = getComputedStyle(document.body).color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                const brightness = Number(match[1]) * 0.2126 + Number(match[2]) * 0.7152 + Number(match[3]) * 0.0722;
                return brightness > 150 ? 'dark' : 'light';
            }
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyScriptTheme() {
        const preference = GM_getValue(SCRIPT_THEME_KEY, 'auto');
        const theme = preference === 'dark' || preference === 'light' ? preference : detectOkdeskTheme();
        if (document.documentElement.dataset.okdeskScriptTheme !== theme) document.documentElement.dataset.okdeskScriptTheme = theme;
    }

    applyScriptTheme();

    if (!GM_getValue(API_TOKEN_KEY, '') && GM_getValue(LEGACY_API_TOKEN_KEY, '')) {
        GM_setValue(API_TOKEN_KEY, GM_getValue(LEGACY_API_TOKEN_KEY, ''));
    }

    GM_registerMenuCommand('Настройки скрипта Okdesk', openSettings);
    GM_registerMenuCommand('Переключить мобильный режим Okdesk', () => {
        GM_setValue(MOBILE_VIEW_KEY, isMobileViewEnabled() ? 'off' : 'on');
        location.reload();
    });

    if (isMobileViewEnabled() && /^\/issues(?:\/\d+)?\/?$/.test(location.pathname)) {
        initMobileView();
    } else {
    document.addEventListener('contextmenu', (event) => {
        const selection = window.getSelection()?.toString().trim();
        if (!selection || event.altKey) {
            return;
        }

        const issueId = getIssueId();
        if (!issueId) {
            return;
        }

        event.preventDefault();
        showContextMenu(event.clientX, event.clientY, selection, issueId);
    });

    document.addEventListener('contextmenu', handleSendContextMenu, true);
    document.addEventListener('contextmenu', handleIssueListContextMenu, true);
    document.addEventListener('click', hideMenus);
    document.addEventListener('pointerdown', (event) => {
        if (issueListPreview && !issueListPreview.contains(event.target)
            && !event.target.closest?.('[data-okdesk-quick-reply-confirmation]')) closeIssueListPreview();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeIssueListPreview();
    });
    document.addEventListener('mousedown', (event) => {
        if (templateMenu && !templateMenu.contains(event.target)) {
            hideTemplateMenu();
        }
    });
    document.addEventListener('click', handleCommentSend, true);
    addSendHints();
    addQuickIssueOpenButtons();
    addQuickReplyPanel();
    attachTemplateEditors();
    scheduleVideoEnhancement();
    scheduleEquipmentTitleNormalization();
    new MutationObserver(() => {
        addSendHints();
        addQuickIssueOpenButtons();
        addQuickReplyPanel();
        attachTemplateEditors();
        scheduleVideoEnhancement();
        scheduleEquipmentTitleNormalization();
    }).observe(document.documentElement, { childList: true, subtree: true });
    window.setInterval(() => {
        applyScriptTheme();
        addSendHints();
        addQuickIssueOpenButtons();
        addQuickReplyPanel();
        attachTemplateEditors();
        scheduleVideoEnhancement();
        scheduleEquipmentTitleNormalization();
    }, 1500);
    }

    function isMobileViewEnabled() {
        if (new URLSearchParams(location.search).has('okdesk_desktop')) return false;
        const setting = GM_getValue(MOBILE_VIEW_KEY, 'auto');
        if (setting === 'on') return true;
        if (setting === 'off') return false;
        return window.matchMedia('(pointer: coarse)').matches
            && Math.min(window.screen.width, window.screen.height) <= 720;
    }

    function initMobileView() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
        const style = document.createElement('style');
        style.textContent = `
            #okdesk-mobile-app { position:fixed; inset:0; z-index:2147483630; height:100vh; height:100dvh; display:flex; flex-direction:column; background:#e9efed; color:#203033; font:15px Arial,sans-serif; letter-spacing:0; }
            #okdesk-mobile-app * { box-sizing:border-box; }
            #okdesk-mobile-app button, #okdesk-mobile-app input, #okdesk-mobile-app select, #okdesk-mobile-app textarea { font:inherit; letter-spacing:0; }
            #okdesk-mobile-app button { cursor:pointer; }
            #okdesk-mobile-app button:disabled { cursor:default; opacity:.5; }
            #okdesk-mobile-app .m-top { min-height:56px; padding:8px 12px; padding-top:max(8px, env(safe-area-inset-top)); display:flex; align-items:center; gap:8px; background:#327b91; color:#fff; box-shadow:0 2px 8px rgba(25,53,59,.18); }
            #okdesk-mobile-app .m-top strong { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:16px; }
            #okdesk-mobile-app .m-icon { width:42px; height:42px; flex:0 0 42px; border:0; border-radius:6px; background:rgba(255,255,255,.15); color:#fff; font-size:20px; }
            #okdesk-mobile-app .m-icon[hidden], #okdesk-mobile-app [hidden] { display:none !important; }
            #okdesk-mobile-app .m-body { min-height:0; flex:1; overflow:auto; overscroll-behavior:contain; }
            #okdesk-mobile-app .m-toolbar { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #d5e0dc; background:#fff; }
            #okdesk-mobile-app .m-toolbar input { flex:1; min-width:0; height:42px; padding:0 12px; border:1px solid #c5d5d2; border-radius:8px; background:#f3f7f6; font-size:16px; }
            #okdesk-mobile-app .m-tabs-bar { display:flex; background:#fff; border-bottom:1px solid #d7dfdc; }
            #okdesk-mobile-app .m-tabs { position:relative; display:flex; flex:1; min-width:0; overflow-x:auto; scrollbar-width:thin; }
            #okdesk-mobile-app .m-tabs button { flex:1 0 auto; min-width:110px; height:44px; padding:0 12px; border:0; border-bottom:3px solid transparent; background:transparent; color:#526361; white-space:nowrap; }
            #okdesk-mobile-app .m-tabs button[aria-selected="true"] { border-bottom-color:#327b91; color:#225e71; font-weight:700; }
            #okdesk-mobile-app .m-tabs-add { width:44px; min-width:44px; height:44px; border:0; border-left:1px solid #d7dfdc; background:#fff; color:#327b91; font-size:24px; }
            #okdesk-mobile-app .m-toolbar button { width:42px; height:42px; flex:0 0 42px; border:1px solid #b8c8c4; border-radius:4px; background:#fff; color:#244a41; font-size:20px; }
            #okdesk-mobile-app .m-row { display:flex; align-items:center; gap:12px; width:100%; padding:13px 14px; border:0; border-bottom:1px solid #e0e8e5; background:#fff; color:#203033; text-align:left; }
            #okdesk-mobile-app .m-row-wrap { position:relative; margin:8px 10px; border:1px solid #d1ddda; border-radius:8px; background:#fff; box-shadow:0 1px 3px rgba(35,65,61,.07); overflow:hidden; }
            #okdesk-mobile-app .m-row-wrap .m-row { min-height:98px; padding-right:66px; border-bottom:0; }
            #okdesk-mobile-app .m-row-body { display:block; flex:1; min-width:0; }
            #okdesk-mobile-app .m-avatar { display:grid; place-items:center; width:44px; height:44px; flex:0 0 44px; border-radius:50%; color:#fff; font-size:16px; font-weight:700; }
            #okdesk-mobile-app .m-row-more { position:absolute; top:50%; right:10px; transform:translateY(-50%); width:42px; height:42px; border:1px solid #d7e2de; border-radius:8px; background:#f5f8f7; color:#327b91; font-size:24px; }
            #okdesk-mobile-app .m-row:active { background:#e5f2ed; }
            #okdesk-mobile-app .m-row-title { display:block; margin:5px 0 7px; font-weight:600; line-height:1.35; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-row-meta { display:flex; justify-content:space-between; gap:8px; color:#566665; font-size:12px; }
            #okdesk-mobile-app .m-status { display:inline-block; max-width:100%; padding:3px 7px; border-left:3px solid #167965; border-radius:0 4px 4px 0; background:#edf4f1; color:#263638; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            #okdesk-mobile-app .m-assignee { display:block; margin-top:6px; color:#536965; font-size:12px; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-section { padding:16px; border-bottom:1px solid #d7dfdc; background:#fff; }
            #okdesk-mobile-app .m-section + .m-section { margin-top:8px; border-top:1px solid #d7dfdc; }
            #okdesk-mobile-app .m-section h2 { margin:0 0 10px; font-size:15px; }
            #okdesk-mobile-app .m-status-section { padding:12px 16px; }
            #okdesk-mobile-app .m-status-section h2 { margin-bottom:4px; }
            #okdesk-mobile-app .m-status-section .m-field { margin:4px 0; }
            #okdesk-mobile-app .m-status-section .m-feedback:empty { display:none; }
            #okdesk-mobile-app .m-issue-title { margin:8px 0 12px; font-size:18px; line-height:1.35; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-copy { line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-rich { line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-rich p, #okdesk-mobile-app .m-rich div { margin:0 0 8px; }
            #okdesk-mobile-app .m-rich a, #okdesk-mobile-app .m-attachment a { color:#08715c; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-rich img, #okdesk-mobile-app .m-attachment img { display:block; max-width:100%; max-height:360px; width:auto; height:auto; margin:8px 0; object-fit:contain; border-radius:4px; }
            #okdesk-mobile-app .m-rich video, #okdesk-mobile-app .m-attachment video, #okdesk-mobile-app .m-rich audio, #okdesk-mobile-app .m-attachment audio { display:block; width:100%; max-width:100%; margin:8px 0; }
            #okdesk-mobile-app .m-rich iframe { display:block; width:100%; aspect-ratio:16/9; margin:8px 0; border:0; }
            #okdesk-mobile-app .m-attachment { margin:10px 0; padding:8px 0; border-top:1px solid #e0e7e4; }
            #okdesk-mobile-app .m-attachment-title { font-size:13px; font-weight:600; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-attachments-section { padding:0; }
            #okdesk-mobile-app .m-attachments-toggle { display:flex; align-items:center; justify-content:space-between; min-height:50px; padding:12px 16px; cursor:pointer; font-size:15px; font-weight:700; list-style:none; }
            #okdesk-mobile-app .m-attachments-toggle::-webkit-details-marker { display:none; }
            #okdesk-mobile-app .m-attachments-toggle::after { content:'▸'; color:#327b91; font-size:18px; }
            #okdesk-mobile-app .m-attachments-section[open] .m-attachments-toggle::after { content:'▾'; }
            #okdesk-mobile-app .m-attachments-body { padding:0 16px 12px; }
            #okdesk-mobile-app .m-muted { color:#667674; font-size:13px; line-height:1.4; }
            #okdesk-mobile-app .m-thread-section { background:#e9efed; }
            #okdesk-mobile-app .m-thread-section > h2 { color:#3f5e62; }
            #okdesk-mobile-app .m-comment { width:max-content; min-width:min(58%, 200px); max-width:min(90%, 680px); margin:10px 0; padding:10px 12px; border:1px solid #cfddda; border-radius:8px; background:#fff; box-shadow:0 1px 2px rgba(35,65,61,.08); overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-comment-out { margin-left:auto; border-color:#b8d7c7; background:#dff0e6; }
            #okdesk-mobile-app .m-comment-private { border-left:3px solid #b98437; background:#fff8e9; }
            #okdesk-mobile-app .m-comment-out.m-comment-private { background:#edf1e8; }
            #okdesk-mobile-app .m-comment-head { display:flex; justify-content:space-between; gap:8px; margin-bottom:6px; font-size:12px; color:#60706e; }
            #okdesk-mobile-app .m-comment-head strong { color:#243638; }
            #okdesk-mobile-app .m-actions { display:flex; flex-wrap:wrap; gap:8px; }
            #okdesk-mobile-app .m-actions button { flex:1 1 calc(50% - 8px); min-width:0; min-height:52px; padding:6px 10px; border:1px solid #cbd9d5; border-left-width:4px; border-radius:6px; background:#f8fbfa; color:#1e3431; text-align:left; overflow-wrap:anywhere; }
            #okdesk-mobile-app .m-actions button span, #okdesk-mobile-app .m-actions button small { display:block; }
            #okdesk-mobile-app .m-actions button small { margin-top:3px; color:#5d706b; font-size:11px; }
            #okdesk-mobile-app .m-field { display:block; width:100%; min-height:42px; margin:8px 0; padding:9px 10px; border:1px solid #b8c8c4; border-radius:6px; background:#f8fbfa; color:#192527; font-size:16px; }
            #okdesk-mobile-app textarea.m-field { min-height:130px; resize:vertical; }
            #okdesk-mobile-app .m-primary, #okdesk-mobile-app .m-secondary { min-height:44px; padding:8px 12px; border-radius:4px; }
            #okdesk-mobile-app .m-primary { border:1px solid #246c80; background:#327b91; color:#fff; }
            #okdesk-mobile-app .m-secondary { border:1px solid #aebfbb; background:#fff; color:#263638; }
            #okdesk-mobile-app .m-line { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
            #okdesk-mobile-app .m-line > .m-field { flex:1; min-width:140px; width:auto; }
            #okdesk-mobile-app .m-send-actions { display:grid; grid-template-columns:minmax(0, 1fr) 48px; gap:8px; }
            #okdesk-mobile-app .m-send-actions button { width:100%; }
            #okdesk-mobile-app .m-feedback { min-height:18px; margin:8px 0; color:#9c372f; font-size:13px; }
            #okdesk-mobile-app .m-bottom { padding-bottom:max(12px, env(safe-area-inset-bottom)); }
            #okdesk-mobile-app .m-sheet-backdrop { position:fixed; inset:0; z-index:20; display:flex; align-items:flex-end; background:rgba(0,0,0,.55); }
            #okdesk-mobile-app .m-sheet { width:100%; max-height:88dvh; overflow:auto; padding:16px 16px max(16px, env(safe-area-inset-bottom)); border-radius:8px 8px 0 0; background:#fff; box-shadow:0 -8px 28px rgba(0,0,0,.16); }
            #okdesk-mobile-app .m-sheet-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
            #okdesk-mobile-app .m-sheet-head strong { flex:1; min-width:0; font-size:16px; }
            #okdesk-mobile-app .m-sheet-close { width:40px; height:40px; border:0; background:#edf2f0; color:#253d38; font-size:24px; }
            #okdesk-mobile-app .m-sheet-choice { display:block; width:100%; min-height:44px; padding:10px 4px; border:0; border-bottom:1px solid #e0e7e4; background:#fff; color:#1d302c; text-align:left; }
            #okdesk-mobile-app .m-sheet-label { margin:16px 0 4px; color:#60716d; font-size:12px; font-weight:700; text-transform:uppercase; }
            #okdesk-mobile-app .m-selection-action { position:absolute; right:16px; bottom:max(16px, env(safe-area-inset-bottom)); z-index:10; min-height:44px; padding:8px 14px; border:1px solid #246c80; border-radius:6px; background:#327b91; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.22); }
            #okdesk-mobile-app .m-summary-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:10px; }
            #okdesk-mobile-app .m-summary-actions a { color:#167965; font-size:13px; }
            @media (max-width:360px) {
                #okdesk-mobile-app .m-top { gap:4px; padding-left:8px; padding-right:8px; }
                #okdesk-mobile-app .m-top strong { font-size:14px; }
                #okdesk-mobile-app .m-icon { width:38px; height:38px; flex-basis:38px; }
            }
        `;
        document.head.appendChild(style);
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        const app = document.createElement('div');
        app.id = 'okdesk-mobile-app';
        app.dataset.okdeskScriptUi = 'true';
        app.innerHTML = `<header class="m-top"><button type="button" class="m-icon" data-action="back" aria-label="Назад" hidden>←</button><strong data-role="heading">Заявки</strong><button type="button" class="m-icon" data-action="refresh" aria-label="Обновить">⟳</button><button type="button" class="m-icon" data-action="desktop" aria-label="ПК-вид" title="ПК-вид">ПК</button><button type="button" class="m-icon" data-action="settings" aria-label="Настройки">⚙</button></header><main class="m-body" data-role="content"></main>`;
        document.body.appendChild(app);
        const state = { issueId: getIssueId(), issue: null, tabs: mobileReadTabs(), tabId: GM_getValue(MOBILE_ACTIVE_TAB_KEY, 'mine'), query: '', page: 0, items: [], hasMore: true, loading: false, listError: '', listRequest: 0, detailRequest: 0 };
        if (!state.tabs.some((tab) => tab.id === state.tabId)) state.tabId = state.tabs[0].id;
        let activeMobileSheetClose = null;
        const content = app.querySelector('[data-role="content"]');
        const assigneeRequests = new Map();
        const assigneeQueue = [];
        let assigneeActive = 0;
        const assigneeObserver = 'IntersectionObserver' in window
            ? new IntersectionObserver((entries) => entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                assigneeObserver.unobserve(entry.target);
                mobileFillAssignee(entry.target);
            }), { root: content, rootMargin: '250px' })
            : null;
        app.querySelector('[data-action="back"]').onclick = () => mobileNavigate(null);
        app.querySelector('[data-action="refresh"]').onclick = () => state.issueId ? mobileLoadIssue(state.issueId) : mobileLoadList(true);
        app.querySelector('[data-action="desktop"]').onclick = () => { GM_setValue(MOBILE_VIEW_KEY, 'off'); location.reload(); };
        app.querySelector('[data-action="settings"]').onclick = openSettings;
        window.addEventListener('popstate', () => {
            state.issueId = getIssueId();
            if (state.issueId) mobileLoadIssue(state.issueId);
            else { mobileRenderList(); if (!state.items.length) mobileLoadList(true); }
        });

        function mobileNode(tag, className = '', value = '') {
            const element = document.createElement(tag);
            if (className) element.className = className;
            element.textContent = value;
            return element;
        }

        function mobileReadTabs() {
            const defaults = [
                { id: 'mine', name: 'Мои', scope: 'mine', assigneeId: 0, withinGroup: false, hideFinished: true, statusCodes: [], withoutAnswer: false, overdue: false },
                { id: 'group', name: 'Заявки группы', scope: 'group', assigneeId: 0, withinGroup: true, hideFinished: true, statusCodes: [], withoutAnswer: false, overdue: false },
            ];
            const savedStatusCodes = new Set(getSavedIssueStatuses().map((status) => status.code));
            try {
                const saved = JSON.parse(GM_getValue(MOBILE_TABS_KEY, 'null'));
                if (!Array.isArray(saved) || !saved.length) return defaults;
                const ids = new Set();
                const tabs = saved.map((tab) => ({
                    id: String(tab?.id || ''),
                    name: String(tab?.name || '').trim().slice(0, 32),
                    scope: ['mine', 'group', 'employee'].includes(tab?.scope) ? tab.scope : 'group',
                    assigneeId: Number.isInteger(Number(tab?.assigneeId)) && Number(tab.assigneeId) > 0 ? Number(tab.assigneeId) : 0,
                    withinGroup: tab?.withinGroup !== false,
                    hideFinished: tab?.hideFinished !== false,
                    statusCodes: Array.isArray(tab?.statusCodes) ? tab.statusCodes.filter((code) => savedStatusCodes.has(code)).slice(0, 20) : [],
                    withoutAnswer: tab?.withoutAnswer === true,
                    overdue: tab?.overdue === true,
                })).filter((tab) => tab.id && tab.name && !ids.has(tab.id) && ids.add(tab.id));
                return tabs.length ? tabs : defaults;
            } catch (_) { return defaults; }
        }

        function mobileGroupId() {
            const saved = Number(GM_getValue(MOBILE_GROUP_ID_KEY, 0));
            return Number.isInteger(saved) && saved > 0 ? saved : Number(getTransferSettings().groupId) || 0;
        }

        function mobileCurrentTab() {
            return state.tabs.find((tab) => tab.id === state.tabId) || state.tabs[0];
        }

        function mobileSaveTabs(reloadList = true) {
            GM_setValue(MOBILE_TABS_KEY, JSON.stringify(state.tabs));
            if (!state.tabs.some((tab) => tab.id === state.tabId)) state.tabId = state.tabs[0].id;
            GM_setValue(MOBILE_ACTIVE_TAB_KEY, state.tabId);
            if (reloadList && !state.issueId) { state.listRequest++; state.loading = false; mobileLoadList(true); }
            else if (!state.issueId) mobileRenderList();
        }

        function mobileOpenTabEditor(tabId = state.tabId) {
            const { body, close } = mobileShowSheet('Вкладки и фильтры');
            const groupLabel = mobileNode('label', 'm-muted', 'ID ответственной группы');
            const groupInput = mobileNode('input', 'm-field');
            groupInput.type = 'number'; groupInput.min = '1'; groupInput.inputMode = 'numeric';
            groupInput.value = mobileGroupId() || '';
            groupInput.setAttribute('aria-label', 'ID ответственной группы');
            const groupSave = mobileNode('button', 'm-secondary', 'Сохранить группу');
            groupSave.type = 'button';
            const groupFeedback = mobileNode('div', 'm-feedback');
            const persistGroup = () => {
                const id = Number(groupInput.value);
                if (!Number.isInteger(id) || id <= 0) { groupFeedback.textContent = 'Укажите положительный ID группы.'; return false; }
                GM_setValue(MOBILE_GROUP_ID_KEY, id);
                groupFeedback.textContent = 'Группа сохранена.';
                return true;
            };
            groupSave.onclick = () => {
                if (!persistGroup()) return;
                if (!state.issueId && mobileCurrentTab().scope === 'group') mobileSaveTabs();
            };
            body.append(groupLabel, groupInput, groupSave, groupFeedback);
            const tabList = mobileNode('div');
            const editor = mobileNode('div');
            body.append(mobileNode('div', 'm-sheet-label', 'Вкладки'), tabList, editor);
            let draft = tabId === null
                ? { id: crypto.randomUUID(), name: '', scope: 'group', assigneeId: 0, withinGroup: true, hideFinished: true, statusCodes: [], withoutAnswer: false, overdue: false }
                : state.tabs.find((tab) => tab.id === tabId);
            draft = draft ? { ...draft, statusCodes: [...draft.statusCodes] } : null;
            const availableStatuses = getSavedIssueStatuses();

            const renderStatuses = (container) => {
                container.replaceChildren();
                availableStatuses.forEach((status) => {
                    const label = mobileNode('label', 'm-line');
                    Object.assign(label.style, { minHeight: '38px', borderBottom: '1px solid #e6eeea' });
                    const checkbox = mobileNode('input'); checkbox.type = 'checkbox'; checkbox.value = status.code;
                    checkbox.checked = draft.statusCodes.includes(status.code);
                    checkbox.onchange = () => {
                        draft.statusCodes = checkbox.checked
                            ? [...draft.statusCodes, status.code]
                            : draft.statusCodes.filter((code) => code !== status.code);
                        if (checkbox.checked && ['completed', 'closed'].includes(status.code)) {
                            draft.hideFinished = false;
                            const hideFinished = editor.querySelector('[data-role="mobile-hide-finished"]');
                            if (hideFinished) hideFinished.checked = false;
                        }
                    };
                    label.append(checkbox, mobileNode('span', '', status.name));
                    container.appendChild(label);
                });
            };

            const renderEditor = () => {
                editor.replaceChildren();
                if (!draft) return;
                editor.appendChild(mobileNode('div', 'm-sheet-label', state.tabs.some((tab) => tab.id === draft.id) ? 'Изменить вкладку' : 'Новая вкладка'));
                const name = mobileNode('input', 'm-field');
                name.placeholder = 'Название вкладки'; name.value = draft.name;
                name.setAttribute('aria-label', 'Название вкладки');
                const scope = mobileNode('select', 'm-field');
                scope.setAttribute('aria-label', 'Выборка заявок');
                [['mine', 'Назначенные мне'], ['group', 'Заявки группы'], ['employee', 'Другой сотрудник']].forEach(([value, label]) => {
                    const option = mobileNode('option', '', label); option.value = value; scope.appendChild(option);
                });
                scope.value = draft.scope;
                const employeeFields = mobileNode('div');
                const employeeId = mobileNode('input', 'm-field');
                employeeId.type = 'number'; employeeId.inputMode = 'numeric'; employeeId.min = '1';
                employeeId.value = draft.assigneeId || '';
                employeeId.placeholder = 'ID сотрудника'; employeeId.setAttribute('aria-label', 'ID сотрудника');
                const employeeSelect = mobileNode('select', 'm-field');
                employeeSelect.setAttribute('aria-label', 'Выбрать сотрудника группы');
                const employeePlaceholder = mobileNode('option', '', 'Выбрать сотрудника группы...');
                employeePlaceholder.value = '';
                employeeSelect.appendChild(employeePlaceholder);
                employeeSelect.onchange = () => {
                    if (!employeeSelect.value) return;
                    employeeId.value = employeeSelect.value;
                    if (!name.value.trim()) name.value = employeeSelect.selectedOptions[0].textContent;
                };
                const withinGroupLabel = mobileNode('label', 'm-line');
                const withinGroup = mobileNode('input'); withinGroup.type = 'checkbox'; withinGroup.checked = draft.withinGroup;
                withinGroupLabel.append(withinGroup, mobileNode('span', '', 'Только заявки указанной группы'));
                const employeeFeedback = mobileNode('div', 'm-muted');
                employeeFields.append(employeeSelect, employeeId, withinGroupLabel, employeeFeedback);
                let employeesLoaded = false;
                let employeeLoadRequest = 0;
                const showEmployeeFields = () => {
                    employeeFields.hidden = scope.value !== 'employee';
                    if (employeeFields.hidden || employeesLoaded) return;
                    const groupId = Number(groupInput.value) || mobileGroupId();
                    if (!groupId) { employeeFeedback.textContent = 'Укажите группу выше или введите ID сотрудника вручную.'; return; }
                    employeesLoaded = true;
                    const request = ++employeeLoadRequest;
                    employeeFeedback.textContent = 'Загружаю сотрудников группы...';
                    loadGroupEmployees(groupId).then((employees) => {
                        if (!employeeFields.isConnected || request !== employeeLoadRequest) return;
                        employeeSelect.replaceChildren();
                        const placeholder = mobileNode('option', '', 'Выбрать сотрудника группы...');
                        placeholder.value = ''; employeeSelect.appendChild(placeholder);
                        employees.forEach((employee) => {
                            const option = mobileNode('option', '', employee.name);
                            option.value = String(employee.id); employeeSelect.appendChild(option);
                        });
                        employeeSelect.value = String(employeeId.value || '');
                        employeeFeedback.textContent = '';
                    }).catch((error) => { if (employeeFields.isConnected && request === employeeLoadRequest) employeeFeedback.textContent = `Не удалось загрузить список: ${error.message}. Введите ID вручную.`; });
                };
                scope.onchange = showEmployeeFields;
                groupInput.onchange = () => {
                    employeeLoadRequest++;
                    employeesLoaded = false;
                    employeeId.value = '';
                    employeeSelect.replaceChildren(employeePlaceholder);
                    showEmployeeFields();
                };
                const statusList = mobileNode('div');
                Object.assign(statusList.style, { maxHeight: '180px', overflowY: 'auto' });
                statusList.dataset.role = 'mobile-status-filter';
                renderStatuses(statusList);
                const hideFinishedLabel = mobileNode('label', 'm-line');
                const hideFinished = mobileNode('input'); hideFinished.type = 'checkbox'; hideFinished.checked = draft.hideFinished;
                hideFinished.dataset.role = 'mobile-hide-finished';
                hideFinishedLabel.append(hideFinished, mobileNode('span', '', 'Скрывать решённые и закрытые'));
                const withoutAnswerLabel = mobileNode('label', 'm-line');
                const withoutAnswer = mobileNode('input'); withoutAnswer.type = 'checkbox'; withoutAnswer.checked = draft.withoutAnswer;
                withoutAnswerLabel.append(withoutAnswer, mobileNode('span', '', 'Без ответа сотрудника'));
                const overdueLabel = mobileNode('label', 'm-line');
                const overdue = mobileNode('input'); overdue.type = 'checkbox'; overdue.checked = draft.overdue;
                overdueLabel.append(overdue, mobileNode('span', '', 'Просроченные'));
                const save = mobileNode('button', 'm-primary', 'Сохранить вкладку');
                save.type = 'button';
                const feedback = mobileNode('div', 'm-feedback');
                save.onclick = () => {
                    const title = name.value.trim().slice(0, 32);
                    if (!title) { feedback.textContent = 'Введите название вкладки.'; return; }
                    if (groupInput.value.trim() && !persistGroup()) { feedback.textContent = 'Проверьте ID группы выше.'; return; }
                    if ((scope.value === 'group' || (scope.value === 'employee' && withinGroup.checked)) && !mobileGroupId()) {
                        feedback.textContent = 'Укажите ID группы выше.'; return;
                    }
                    const selectedEmployeeId = Number(employeeId.value);
                    if (scope.value === 'employee' && (!Number.isInteger(selectedEmployeeId) || selectedEmployeeId <= 0)) {
                        feedback.textContent = 'Выберите сотрудника или укажите его ID.'; return;
                    }
                    const updated = { ...draft, name: title, scope: scope.value,
                        assigneeId: scope.value === 'employee' ? selectedEmployeeId : 0,
                        withinGroup: withinGroup.checked,
                        hideFinished: hideFinished.checked && !draft.statusCodes.some((code) => ['completed', 'closed'].includes(code)),
                        withoutAnswer: withoutAnswer.checked, overdue: overdue.checked };
                    const index = state.tabs.findIndex((tab) => tab.id === draft.id);
                    if (index < 0) state.tabs.push(updated); else state.tabs[index] = updated;
                    state.tabId = updated.id;
                    mobileSaveTabs();
                    close();
                };
                editor.append(name, scope, employeeFields, hideFinishedLabel, mobileNode('div', 'm-sheet-label', 'Статусы (пусто = любые)'), statusList, withoutAnswerLabel, overdueLabel, save, feedback);
                showEmployeeFields();
            };

            const renderTabList = () => {
                tabList.replaceChildren();
                state.tabs.forEach((tab, index) => {
                    const row = mobileNode('div', 'm-line');
                    Object.assign(row.style, { borderBottom: '1px solid #e0e7e4' });
                    const edit = mobileNode('button', 'm-sheet-choice', tab.name);
                    Object.assign(edit.style, { flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
                    edit.onclick = () => { draft = { ...tab, statusCodes: [...tab.statusCodes] }; renderEditor(); };
                    row.appendChild(edit);
                    [['↑', -1], ['↓', 1]].forEach(([symbol, offset]) => {
                        const move = mobileNode('button', 'm-sheet-close', symbol);
                        move.type = 'button'; move.title = offset < 0 ? 'Выше' : 'Ниже';
                        move.setAttribute('aria-label', move.title);
                        move.disabled = index + offset < 0 || index + offset >= state.tabs.length;
                        move.onclick = () => {
                            [state.tabs[index], state.tabs[index + offset]] = [state.tabs[index + offset], state.tabs[index]];
                            mobileSaveTabs(false); renderTabList();
                        };
                        row.appendChild(move);
                    });
                    const remove = mobileNode('button', 'm-sheet-close', '×');
                    remove.type = 'button'; remove.title = 'Удалить вкладку'; remove.disabled = state.tabs.length === 1;
                    remove.setAttribute('aria-label', remove.title);
                    remove.onclick = async () => {
                        if (!await mobileConfirm('Удалить вкладку?', `«${tab.name}» будет удалена только из мобильного списка.`, 'Удалить')) return;
                        state.tabs.splice(index, 1);
                        if (draft?.id === tab.id) draft = null;
                        mobileSaveTabs(); renderTabList(); renderEditor();
                    };
                    row.appendChild(remove);
                    tabList.appendChild(row);
                });
                const add = mobileNode('button', 'm-secondary', '+ Новая вкладка');
                add.type = 'button';
                add.onclick = () => {
                    draft = { id: crypto.randomUUID(), name: '', scope: 'group', assigneeId: 0, withinGroup: true, hideFinished: true, statusCodes: [], withoutAnswer: false, overdue: false };
                    renderEditor();
                    editor.querySelector('[aria-label="Название вкладки"]')?.focus();
                };
                tabList.appendChild(add);
            };
            renderTabList(); renderEditor();
        }

        function mobileShowSheet(title) {
            activeMobileSheetClose?.();
            const backdrop = mobileNode('div', 'm-sheet-backdrop');
            const sheet = mobileNode('div', 'm-sheet');
            sheet.setAttribute('role', 'dialog');
            sheet.setAttribute('aria-label', title);
            const head = mobileNode('div', 'm-sheet-head');
            const closeButton = mobileNode('button', 'm-sheet-close', '×');
            closeButton.type = 'button'; closeButton.setAttribute('aria-label', 'Закрыть');
            const close = () => {
                backdrop.remove();
                document.removeEventListener('keydown', onKeydown);
                if (activeMobileSheetClose === close) activeMobileSheetClose = null;
            };
            const onKeydown = (event) => { if (event.key === 'Escape') close(); };
            closeButton.onclick = close;
            head.append(mobileNode('strong', '', title), closeButton);
            const body = mobileNode('div');
            sheet.append(head, body); backdrop.appendChild(sheet); app.appendChild(backdrop);
            backdrop.onclick = (event) => { if (event.target === backdrop) close(); };
            document.addEventListener('keydown', onKeydown);
            activeMobileSheetClose = close;
            return { body, close };
        }

        function mobileSheetChoice(body, label, action) {
            const button = mobileNode('button', 'm-sheet-choice', label);
            button.type = 'button'; button.onclick = action;
            body.appendChild(button);
            return button;
        }

        function mobilePromptValue(title, initialValue, apply) {
            const { body, close } = mobileShowSheet(title);
            const input = mobileNode('input', 'm-field');
            input.type = 'text'; input.value = initialValue;
            input.setAttribute('aria-label', title);
            const feedback = mobileNode('div', 'm-feedback');
            const save = mobileNode('button', 'm-primary', 'Сохранить');
            save.type = 'button';
            save.onclick = async () => {
                const value = input.value.trim();
                if (!value) { feedback.textContent = 'Введите значение.'; return; }
                save.disabled = true;
                try { await apply(value); close(); }
                catch (error) { feedback.textContent = error.message; save.disabled = false; }
            };
            body.append(input, save, feedback);
            input.focus();
        }

        function mobileIssueActions(issueId, issue) {
            const { body, close } = mobileShowSheet(`Действия с заявкой №${issueId}`);
            const add = (label, action) => mobileSheetChoice(body, label, () => { close(); action(); });
            body.appendChild(mobileNode('div', 'm-sheet-label', 'Ссылка и просмотр'));
            add('Копировать ссылку на заявку', () => copyText(`${location.origin}/issues/${issueId}`));
            add('Открыть полную карточку', () => { location.href = `/issues/${issueId}?okdesk_desktop=1`; });
            body.appendChild(mobileNode('div', 'm-sheet-label', 'Тема и поля'));
            add('Изменить тему', () => mobilePromptValue('Тема заявки', issue.title || '', async (value) => {
                const { name } = await getIssueEquipmentName(issue);
                await setIssueTitleFromSelection(issueId, value, name);
            }));
            add('Записать заводской номер', () => mobilePromptValue('Заводской номер', '', (value) => updateParameter(issueId, FIELD.serialNumber, value, 'Заводской номер')));
            add('Записать код ЗИП', () => mobilePromptValue('Код ЗИП', '', (value) => updateParameter(issueId, FIELD.sparePartCode, value, 'Код ЗИП')));
            body.appendChild(mobileNode('div', 'm-sheet-label', 'Работа с заявкой'));
            add('Перейти к ответу', () => content.querySelector('[data-mobile-section="compose"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            add('Перейти к статусу', () => content.querySelector('[data-mobile-section="status"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            add('Настройки скрипта', openSettings);
        }

        const selectionAction = mobileNode('button', 'm-selection-action', 'Действия с текстом');
        selectionAction.type = 'button'; selectionAction.hidden = true;
        app.appendChild(selectionAction);
        let selectedMobileText = '';
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            const anchor = selection?.anchorNode;
            const focus = selection?.focusNode;
            const insideContent = anchor && focus && content.contains(anchor) && content.contains(focus);
            const value = insideContent ? selection.toString().trim() : '';
            if (value && state.issueId && !activeMobileSheetClose) selectedMobileText = value;
            selectionAction.hidden = !value || !state.issueId || !!activeMobileSheetClose;
        });
        selectionAction.addEventListener('pointerdown', (event) => event.preventDefault());
        selectionAction.onclick = () => {
            const text = selectedMobileText;
            if (!text || !state.issueId) return;
            selectionAction.hidden = true;
            const { body, close } = mobileShowSheet('Действия с текстом');
            const add = (label, action) => mobileSheetChoice(body, label, () => { close(); action(); });
            add('Копировать', () => copyText(text));
            add('Открыть на портале POScenter', () => openOnPoscenterPortal(text));
            body.appendChild(mobileNode('div', 'm-sheet-label', 'Тема и шаблоны'));
            add('Сделать темой заявки', async () => {
                const { name } = state.issue ? await getIssueEquipmentName(state.issue) : { name: '' };
                setIssueTitleFromSelection(state.issueId, text, name);
            });
            add('Сделать шаблоном', () => openTemplateFromSelection(text));
            body.appendChild(mobileNode('div', 'm-sheet-label', 'Поля заявки'));
            add('Записать в «Заводской номер»', () => updateParameter(state.issueId, FIELD.serialNumber, text, 'Заводской номер'));
            add('Записать в «Код ЗИП»', () => updateParameter(state.issueId, FIELD.sparePartCode, text, 'Код ЗИП'));
            add('Установить «Гарантия»', () => updateParameter(state.issueId, FIELD.warranty, true, 'Гарантия'));
            add('Установить «Не гарантия»', () => updateParameter(state.issueId, FIELD.warranty, false, 'Не гарантия'));
            body.appendChild(mobileNode('div', 'm-sheet-label', 'Для комментария'));
            add('Копировать HTML цитаты', () => copyHtml(createQuoteHtml(text), text));
            add('Копировать HTML спойлера', () => copyHtml(createSpoilerHtml(text), text));
        };

        function mobileNavigate(issueId) {
            activeMobileSheetClose?.();
            if (issueId) { state.listRequest++; state.loading = false; }
            state.issueId = issueId;
            state.issue = null;
            history.pushState({ okdeskMobile: true }, '', issueId ? `/issues/${issueId}` : '/issues');
            content.scrollTop = 0;
            if (issueId) mobileLoadIssue(issueId);
            else { mobileRenderList(); if (!state.items.length) mobileLoadList(true); }
        }

        function mobileRenderList() {
            app.querySelector('[data-role="heading"]').textContent = 'Заявки';
            app.querySelector('[data-action="back"]').hidden = true;
            content.replaceChildren();
            const toolbar = mobileNode('div', 'm-toolbar');
            const search = mobileNode('input');
            search.type = 'search'; search.placeholder = '№ заявки или тема в списке'; search.value = state.query;
            search.setAttribute('aria-label', 'Поиск заявки');
            search.oninput = () => { state.query = search.value.trim(); mobileRenderListRows(rows); };
            const filterButton = mobileNode('button', '', '☷');
            filterButton.type = 'button'; filterButton.setAttribute('aria-label', 'Вкладки и фильтры');
            filterButton.onclick = () => mobileOpenTabEditor();
            toolbar.append(search, filterButton);
            const tabBar = mobileNode('div', 'm-tabs-bar');
            const tabs = mobileNode('div', 'm-tabs');
            state.tabs.forEach((tab) => {
                const button = mobileNode('button', '', tab.name);
                button.type = 'button'; button.setAttribute('aria-selected', String(state.tabId === tab.id));
                button.onclick = () => {
                    if (state.tabId === tab.id) return;
                    state.tabId = tab.id;
                    state.query = '';
                    GM_setValue(MOBILE_ACTIVE_TAB_KEY, state.tabId);
                    state.listRequest++;
                    state.loading = false;
                    state.items = [];
                    mobileRenderList();
                    mobileLoadList(true);
                };
                tabs.appendChild(button);
            });
            const addTab = mobileNode('button', 'm-tabs-add', '+');
            addTab.type = 'button'; addTab.setAttribute('aria-label', 'Добавить вкладку');
            addTab.onclick = () => mobileOpenTabEditor(null);
            tabBar.append(tabs, addTab);
            const rows = mobileNode('div');
            content.append(toolbar, tabBar, rows);
            const activeTab = tabs.querySelector('[aria-selected="true"]');
            if (activeTab) tabs.scrollLeft = Math.max(0, activeTab.offsetLeft - 12);
            mobileRenderListRows(rows);
        }

        function mobileFillAssignee(label) {
            const issueId = label.dataset.issueId;
            if (!assigneeRequests.has(issueId)) {
                assigneeRequests.set(issueId, new Promise((resolve) => {
                    assigneeQueue.push({ issueId, resolve });
                    mobilePumpAssigneeQueue();
                }));
            }
            assigneeRequests.get(issueId).then((name) => {
                if (label.isConnected) label.textContent = `На ком: ${name}`;
            });
        }

        function mobilePumpAssigneeQueue() {
            while (assigneeActive < 3 && assigneeQueue.length) {
                const { issueId, resolve } = assigneeQueue.shift();
                assigneeActive++;
                apiRequest(`/issues/${issueId}`).then((issue) => {
                    resolve(issue?.assignee?.name || 'Не назначена');
                }).catch(() => resolve('Не удалось определить')).finally(() => {
                    assigneeActive--;
                    mobilePumpAssigneeQueue();
                });
            }
        }

        function mobileRenderListRows(rows) {
            rows.replaceChildren();
            const query = state.query.toLocaleLowerCase('ru');
            if (/^\d+$/.test(query)) {
                const open = mobileNode('button', 'm-row', `Открыть заявку №${Number(query)}`);
                open.type = 'button'; open.onclick = () => mobileNavigate(String(Number(query)));
                rows.appendChild(open);
            }
            state.items.filter((issue) => !query || `${issue.id} ${issue.title || ''}`.toLocaleLowerCase('ru').includes(query)).forEach((issue) => {
                const wrap = mobileNode('div', 'm-row-wrap');
                const row = mobileNode('button', 'm-row');
                row.type = 'button'; row.onclick = () => mobileNavigate(String(issue.id));
                const meta = mobileNode('div', 'm-row-meta');
                const date = issue.updated_at ? new Date(issue.updated_at) : null;
                meta.append(mobileNode('span', '', `№${issue.id}`), mobileNode('span', '', date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('ru-RU') : ''));
                const title = mobileNode('span', 'm-row-title', issue.title || 'Без темы');
                const status = mobileNode('span', 'm-status', issue.status?.name || 'Статус не указан');
                if (/^#[0-9a-f]{6}$/i.test(issue.status?.color || '')) status.style.borderLeftColor = issue.status.color;
                const avatar = mobileNode('span', 'm-avatar', String(issue.contact?.name || issue.company?.name || issue.title || issue.id).trim().slice(0, 1).toLocaleUpperCase('ru'));
                avatar.style.backgroundColor = ['#4f8f95', '#a87567', '#6c8fb4', '#8b9760', '#927ca6'][Number(issue.id) % 5];
                const rowBody = mobileNode('span', 'm-row-body');
                rowBody.append(meta, title, status);
                row.append(avatar, rowBody);
                if (mobileCurrentTab().scope !== 'mine') {
                    const assigneeName = issue.assignee?.name || issue.assignee_name;
                    const assigned = mobileNode('span', 'm-assignee', `На ком: ${assigneeName || (issue.assignee === null ? 'Не назначена' : 'Загружаю...')}`);
                    rowBody.appendChild(assigned);
                    if (!assigneeName && issue.assignee !== null) {
                        assigned.dataset.issueId = String(issue.id);
                        if (assigneeObserver) assigneeObserver.observe(assigned);
                        else mobileFillAssignee(assigned);
                    }
                }
                const more = mobileNode('button', 'm-row-more', '⋯');
                more.type = 'button'; more.setAttribute('aria-label', `Действия с заявкой №${issue.id}`);
                more.onclick = () => mobilePreviewIssue(issue);
                wrap.append(row, more);
                rows.appendChild(wrap);
            });
            if (state.listError) {
                rows.appendChild(mobileNode('div', 'm-section m-feedback', state.listError));
                const configure = mobileNode('button', 'm-row', 'Настроить вкладки и группу');
                configure.type = 'button'; configure.onclick = () => mobileOpenTabEditor();
                rows.appendChild(configure);
            } else if (!state.items.length) rows.appendChild(mobileNode('div', 'm-section m-muted', state.loading ? 'Загружаю заявки...' : 'Заявки не найдены.'));
            if (state.items.length && !rows.children.length) rows.appendChild(mobileNode('div', 'm-section m-muted', 'На загруженных страницах совпадений нет.'));
            if (state.hasMore && !state.loading) {
                const more = mobileNode('button', 'm-row', 'Загрузить ещё');
                more.type = 'button'; more.onclick = () => mobileLoadList(false);
                rows.appendChild(more);
            }
        }

        function mobilePreviewIssue(issue) {
            const issueId = String(issue.id);
            const { body, close } = mobileShowSheet(`Заявка №${issueId}`);
            body.appendChild(mobileNode('div', 'm-row-title', issue.title || 'Без темы'));
            mobileSheetChoice(body, 'Открыть заявку', () => { close(); mobileNavigate(issueId); });
            body.appendChild(mobileNode('div', 'm-sheet-label', 'Последний комментарий'));
            const meta = mobileNode('div', 'm-muted');
            const comment = mobileNode('div', 'm-copy', 'Загружаю...');
            Object.assign(comment.style, { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: '3', overflow: 'hidden' });
            body.append(meta, comment, mobileNode('div', 'm-sheet-label', 'Быстрые ответы'));
            const actions = mobileNode('div', 'm-actions');
            getQuickReplies().forEach((reply, index) => {
                const button = mobileNode('button');
                button.type = 'button'; button.style.borderLeftColor = getQuickReplyColor(reply, index);
                button.append(mobileNode('span', '', reply.title), mobileNode('small', '', `${reply.public === false ? 'Скрытый' : 'Открытый'} · ${getStatusLabel(reply.statusCode)}`));
                button.onclick = async () => { if (await runQuickReply(reply, actions, issueId)) close(); };
                actions.appendChild(button);
            });
            if (!actions.children.length) actions.appendChild(mobileNode('div', 'm-muted', 'Кнопки не настроены.'));
            body.appendChild(actions);
            loadIssueListLastComment(issueId, body, meta, comment);
        }

        async function mobileLoadList(reset) {
            if (state.loading || state.issueId) return;
            if (reset) { state.page = 0; state.items = []; state.hasMore = true; state.listError = ''; }
            if (!state.hasMore) return;
            state.loading = true;
            const request = ++state.listRequest;
            mobileRenderList();
            try {
                const params = new URLSearchParams({ 'page[number]': String(state.page + 1), 'page[size]': '30', 'sorting[field]': 'updated_at', 'sorting[direction]': 'reverse' });
                const tab = mobileCurrentTab();
                if (tab.scope === 'mine') params.append('assignee_ids[]', String(await getTokenOwnerEmployeeId()));
                else if (tab.scope === 'employee') {
                    if (!tab.assigneeId) throw new Error('Укажите сотрудника в настройках вкладки.');
                    params.append('assignee_ids[]', String(tab.assigneeId));
                }
                if (tab.scope === 'group' || (tab.scope === 'employee' && tab.withinGroup)) {
                    const groupId = mobileGroupId();
                    if (!groupId) throw new Error('Укажите ID ответственной группы в настройках вкладок.');
                    params.append('assignee_group_ids[]', String(groupId));
                }
                tab.statusCodes.forEach((code) => params.append('status_codes[]', code));
                if (tab.hideFinished && !tab.statusCodes.some((code) => ['completed', 'closed'].includes(code))) {
                    params.append('status_codes_not[]', 'completed');
                    params.append('status_codes_not[]', 'closed');
                }
                if (tab.withoutAnswer) params.set('without_answer', 'true');
                if (tab.overdue) params.set('overdue', 'true');
                const issues = await apiRequest(`/issues/list?${params}`);
                if (request !== state.listRequest || state.issueId) return;
                if (!Array.isArray(issues)) throw new Error('неожиданный ответ API');
                state.items.push(...issues);
                state.page++;
                state.hasMore = issues.length === 30;
            } catch (error) {
                if (request === state.listRequest && !state.issueId) {
                    state.hasMore = false;
                    state.listError = `Не удалось загрузить заявки: ${error.message}`;
                }
            } finally {
                if (request === state.listRequest && !state.issueId) {
                    state.loading = false;
                    mobileRenderList();
                }
            }
        }

        if (state.issueId) mobileLoadIssue(state.issueId);
        else mobileLoadList(true);

        function mobileLoadIssue(issueId) {
            return loadMobileIssueDetail(issueId);
        }

        async function loadMobileIssueDetail(issueId) {
            const request = ++state.detailRequest;
            app.querySelector('[data-role="heading"]').textContent = `Заявка №${issueId}`;
            app.querySelector('[data-action="back"]').hidden = false;
            content.replaceChildren(mobileNode('div', 'm-section m-muted', 'Загружаю заявку...'));
            try {
                const [issue, comments] = await Promise.all([
                    apiRequest(`/issues/${issueId}`),
                    apiRequest(`/issues/${issueId}/comments`),
                ]);
                if (request !== state.detailRequest || state.issueId !== issueId) return;
                if (!issue || !Array.isArray(comments)) throw new Error('неожиданный ответ API');
                mobileRenderIssue(issueId, issue, comments);
            } catch (error) {
                if (request !== state.detailRequest || state.issueId !== issueId) return;
                const errorText = mobileNode('div', 'm-section m-feedback', `Не удалось загрузить заявку: ${error.message}`);
                const full = mobileNode('a', 'm-secondary', 'Открыть полную карточку');
                full.href = `/issues/${issueId}?okdesk_desktop=1`;
                content.replaceChildren(errorText, full);
            }
        }

        function mobilePlainText(html) {
            const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
            parsed.querySelectorAll('script, style').forEach((element) => element.remove());
            parsed.body.querySelectorAll('br').forEach((element) => element.replaceWith('\n'));
            parsed.body.querySelectorAll('p, div, li').forEach((element) => element.append('\n'));
            return (parsed.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
        }

        function mobileSafeUrl(value) {
            if (!value) return '';
            try {
                const url = new URL(String(value || ''), location.origin);
                return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
            } catch (_) { return ''; }
        }

        function mobileTrustedEmbed(url) {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();
            return parsed.protocol === 'https:' && (
                ((host === 'youtube.com' || host === 'www.youtube.com' || host === 'www.youtube-nocookie.com') && parsed.pathname.startsWith('/embed/'))
                || ((host === 'rutube.ru' || host === 'www.rutube.ru') && parsed.pathname.startsWith('/play/embed/'))
                || ((host === 'vk.com' || host === 'vkvideo.ru') && parsed.pathname === '/video_ext.php')
                || (host === 'player.vimeo.com' && parsed.pathname.startsWith('/video/'))
            );
        }

        function mobileRichContent(html) {
            const source = new DOMParser().parseFromString(String(html || ''), 'text/html');
            const root = mobileNode('div', 'm-rich');
            const blocked = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'FORM', 'INPUT', 'BUTTON', 'OBJECT', 'EMBED', 'SVG']);
            const allowed = new Set(['P', 'DIV', 'SPAN', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'PRE', 'CODE', 'STRONG', 'B', 'EM', 'I', 'U', 'H1', 'H2', 'H3', 'H4', 'BR']);
            const appendSafe = (from, into) => {
                if (from.nodeType === Node.TEXT_NODE) { into.appendChild(document.createTextNode(from.textContent)); return; }
                if (from.nodeType !== Node.ELEMENT_NODE || blocked.has(from.tagName)) return;
                const tag = from.tagName;
                if (tag === 'IMG') {
                    const url = mobileSafeUrl(from.getAttribute('src'));
                    if (!url) return;
                    const img = document.createElement('img');
                    img.src = url; img.alt = from.getAttribute('alt') || 'Изображение'; img.loading = 'lazy';
                    if (into.tagName !== 'A') img.onclick = () => window.open(url, '_blank', 'noopener');
                    img.onerror = () => {
                        if (into.tagName === 'A') { img.replaceWith(mobileNode('span', '', 'Открыть изображение ↗')); return; }
                        const link = mobileNode('a', '', 'Открыть изображение ↗');
                        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
                        img.replaceWith(link);
                    };
                    into.appendChild(img);
                    return;
                }
                if (tag === 'VIDEO' || tag === 'AUDIO') {
                    const url = mobileSafeUrl(from.getAttribute('src') || from.querySelector('source[src]')?.getAttribute('src'));
                    if (!url) return;
                    const media = document.createElement(tag.toLowerCase());
                    media.src = url; media.controls = true; media.preload = 'metadata';
                    if (tag === 'VIDEO') media.playsInline = true;
                    const open = mobileNode('a', 'm-muted', 'Открыть отдельно ↗');
                    open.href = url; open.target = '_blank'; open.rel = 'noopener noreferrer';
                    into.append(media, open);
                    return;
                }
                if (tag === 'IFRAME') {
                    const url = mobileSafeUrl(from.getAttribute('src'));
                    if (!url) return;
                    if (mobileTrustedEmbed(url)) {
                        const frame = document.createElement('iframe');
                        frame.src = url; frame.loading = 'lazy'; frame.title = from.getAttribute('title') || 'Видео';
                        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
                        frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
                        frame.allowFullscreen = true;
                        const open = mobileNode('a', 'm-muted', 'Открыть видео отдельно ↗');
                        open.href = url; open.target = '_blank'; open.rel = 'noopener noreferrer';
                        into.append(frame, open);
                    } else {
                        const link = mobileNode('a', '', 'Открыть встроенное содержимое ↗');
                        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
                        into.appendChild(link);
                    }
                    return;
                }
                let target = into;
                if (tag === 'A') {
                    const url = mobileSafeUrl(from.getAttribute('href'));
                    target = document.createElement(url ? 'a' : 'span');
                    if (url) { target.href = url; target.target = '_blank'; target.rel = 'noopener noreferrer'; }
                    into.appendChild(target);
                } else if (allowed.has(tag)) {
                    target = document.createElement(tag.toLowerCase());
                    into.appendChild(target);
                }
                from.childNodes.forEach((child) => appendSafe(child, target));
            };
            source.body.childNodes.forEach((child) => appendSafe(child, root));
            return root;
        }

        function mobileAttachmentKind(attachment) {
            const name = String(attachment.attachment_file_name || '').toLowerCase();
            const mime = String(attachment.content_type || attachment.attachment_content_type || '').toLowerCase();
            if (/\.(?:jpe?g|png|gif|webp|bmp|avif|heic|heif)$/.test(name) || mime.startsWith('image/')) return 'image';
            if (/\.(?:mp4|webm|mov|m4v|ogv|3gp)$/.test(name) || mime.startsWith('video/')) return 'video';
            if (/\.(?:mp3|wav|m4a|ogg|opus|aac)$/.test(name) || mime.startsWith('audio/')) return 'audio';
            return 'file';
        }

        function mobileAttachment(issueId, attachment) {
            const name = attachment.attachment_file_name || 'Вложение';
            const kind = mobileAttachmentKind(attachment);
            const item = mobileNode('div', 'm-attachment');
            item.appendChild(mobileNode('div', 'm-attachment-title', name));
            const preview = mobileNode('div', 'm-muted', kind === 'file' ? '' : 'Загружаю предпросмотр...');
            item.appendChild(preview);
            const getFreshUrl = async () => {
                const file = attachment.id ? await apiRequest(`/issues/${issueId}/attachments/${attachment.id}`) : attachment;
                const url = mobileSafeUrl(file?.attachment_url);
                if (!url) throw new Error('ссылка на файл не найдена');
                return url;
            };
            const openFresh = async (event) => {
                event.preventDefault();
                const tab = window.open('', '_blank');
                if (tab) tab.opener = null;
                try {
                    const url = await getFreshUrl();
                    if (tab && !tab.closed) tab.location.replace(url);
                    else window.location.assign(url);
                } catch (error) {
                    if (tab && !tab.closed) tab.close();
                    preview.appendChild(mobileNode('div', 'm-feedback', `Не удалось открыть файл: ${error.message}`));
                }
            };
            const openLink = (label) => {
                const link = mobileNode('a', 'm-muted', label);
                link.href = '#';
                link.onclick = openFresh;
                return link;
            };
            const load = async () => {
                try {
                    const url = await getFreshUrl();
                    if (!item.isConnected) return;
                    preview.replaceChildren();
                    if (kind === 'image') {
                        const link = openLink('');
                        const img = document.createElement('img');
                        img.src = url; img.alt = name; img.loading = 'lazy'; img.decoding = 'async';
                        img.onerror = () => { img.replaceWith(mobileNode('span', 'm-muted', 'Предпросмотр недоступен. Откройте файл по ссылке ниже.')); };
                        link.appendChild(img); preview.appendChild(link);
                    } else if (kind === 'video' || kind === 'audio') {
                        const media = document.createElement(kind);
                        media.src = url; media.controls = true; media.preload = 'metadata';
                        if (kind === 'video') media.playsInline = true;
                        preview.appendChild(media);
                    }
                    preview.appendChild(openLink(kind === 'file' ? 'Открыть файл ↗' : 'Открыть отдельно ↗'));
                } catch (error) {
                    if (!item.isConnected) return;
                    const full = mobileNode('a', 'm-muted', 'Открыть в полной карточке ↗');
                    full.href = `/issues/${issueId}?okdesk_desktop=1`;
                    preview.replaceChildren(mobileNode('span', 'm-muted', `Предпросмотр недоступен: ${error.message}. `), full);
                }
            };
            queueMicrotask(load);
            return item;
        }

        function mobileRenderIssue(issueId, issue, comments) {
            state.issue = issue;
            content.replaceChildren();
            const summary = mobileNode('section', 'm-section');
            summary.appendChild(mobileNode('h1', 'm-issue-title', issue.title || `Заявка №${issueId}`));
            const details = [issue.company?.name, issue.contact?.name, issue.assignee?.name].filter(Boolean).join(' · ');
            if (details) summary.appendChild(mobileNode('div', 'm-muted', details));
            const equipmentIds = Array.isArray(issue.equipment_ids) ? issue.equipment_ids.filter(Boolean) : [];
            if (equipmentIds.length === 1) {
                const equipment = mobileNode('div', 'm-muted', `Оборудование №${equipmentIds[0]}`);
                summary.appendChild(equipment);
                getIssueEquipmentName(issue).then(({ name }) => {
                    if (name && equipment.isConnected) equipment.textContent = `Оборудование: ${name}`;
                });
            } else if (equipmentIds.length > 1) summary.appendChild(mobileNode('div', 'm-muted', `Оборудование: ${equipmentIds.length} позиции`));
            if (issue.description || issue.content) summary.appendChild(mobileRichContent(issue.description || issue.content));
            const full = mobileNode('a', 'm-muted', 'Полная карточка ↗');
            full.href = `/issues/${issueId}?okdesk_desktop=1`;
            const summaryActions = mobileNode('div', 'm-summary-actions');
            const more = mobileNode('button', 'm-secondary', '⋯');
            more.type = 'button'; more.setAttribute('aria-label', 'Действия с заявкой');
            more.onclick = () => mobileIssueActions(issueId, issue);
            summaryActions.append(full, more);
            summary.appendChild(summaryActions);
            content.appendChild(summary);

            const commentAttachmentIds = new Set(comments.flatMap((comment) => (comment.attachments || []).map((attachment) => String(attachment.id))));
            const issueAttachments = (issue.attachments || []).filter((attachment) => !commentAttachmentIds.has(String(attachment.id)));
            if (issueAttachments.length) {
                const attachmentsSection = mobileNode('details', 'm-section m-attachments-section');
                attachmentsSection.appendChild(mobileNode('summary', 'm-attachments-toggle', `Вложения заявки (${issueAttachments.length})`));
                const attachmentsBody = mobileNode('div', 'm-attachments-body');
                attachmentsSection.appendChild(attachmentsBody);
                attachmentsSection.ontoggle = () => {
                    if (attachmentsSection.open) attachmentsBody.replaceChildren(...issueAttachments.map((attachment) => mobileAttachment(issueId, attachment)));
                    else attachmentsBody.replaceChildren();
                };
                content.appendChild(attachmentsSection);
            }

            const quickSection = mobileNode('section', 'm-section');
            quickSection.appendChild(mobileNode('h2', '', 'Быстрые ответы'));
            const quickActions = mobileNode('div', 'm-actions');
            getQuickReplies().forEach((reply, index) => {
                const button = mobileNode('button');
                button.type = 'button';
                button.title = `${reply.public === false ? 'Скрытый' : 'Открытый'} · ${getStatusLabel(reply.statusCode)}`;
                button.style.borderLeftColor = getQuickReplyColor(reply, index);
                button.append(mobileNode('span', '', reply.title), mobileNode('small', '', `${reply.public === false ? 'Скрытый' : 'Открытый'} · ${getStatusLabel(reply.statusCode)}`));
                button.onclick = async () => {
                    if (await runQuickReply(reply, quickActions, issueId) && !GM_getValue(RELOAD_AFTER_UPDATE_KEY, true)) mobileLoadIssue(issueId);
                };
                quickActions.appendChild(button);
            });
            if (!quickActions.children.length) quickActions.appendChild(mobileNode('span', 'm-muted', 'Кнопки не настроены.'));
            quickSection.appendChild(quickActions);
            content.appendChild(quickSection);

            const commentSection = mobileNode('section', 'm-section m-thread-section');
            commentSection.appendChild(mobileNode('h2', '', `Комментарии (${comments.length})`));
            const thread = mobileNode('div');
            const sorted = comments.slice().sort((left, right) => Date.parse(right.published_at || '') - Date.parse(left.published_at || '') || Number(right.id) - Number(left.id));
            const renderComments = (all) => {
                thread.replaceChildren();
                (all ? sorted : sorted.slice(0, 12)).forEach((comment) => {
                    const item = mobileNode('div', `m-comment${comment.author?.type === 'employee' ? ' m-comment-out' : ''}${comment.public === false ? ' m-comment-private' : ''}`);
                    const head = mobileNode('div', 'm-comment-head');
                    const author = mobileNode('strong', '', comment.author?.name || 'Автор');
                    const date = comment.published_at ? new Date(comment.published_at) : null;
                    head.append(author, mobileNode('span', '', date && !Number.isNaN(date.getTime()) ? date.toLocaleString('ru-RU') : ''));
                    item.append(head);
                    if (comment.public === false) item.appendChild(mobileNode('div', 'm-muted', 'Скрытый комментарий'));
                    if (comment.content) item.appendChild(mobileRichContent(comment.content));
                    (comment.attachments || []).forEach((attachment) => item.appendChild(mobileAttachment(issueId, attachment)));
                    thread.appendChild(item);
                });
                if (!sorted.length) thread.appendChild(mobileNode('div', 'm-muted', 'Комментариев пока нет.'));
            };
            renderComments(false);
            commentSection.appendChild(thread);
            if (sorted.length > 12) {
                const more = mobileNode('button', 'm-secondary', 'Показать все комментарии');
                more.type = 'button'; more.onclick = () => { renderComments(true); more.remove(); };
                commentSection.appendChild(more);
            }
            const compose = mobileNode('section', 'm-section m-bottom');
            compose.dataset.mobileSection = 'compose';
            compose.appendChild(mobileNode('h2', '', 'Ответить'));
            const templateSearch = mobileNode('input', 'm-field');
            templateSearch.type = 'search'; templateSearch.placeholder = 'Поиск шаблона';
            templateSearch.setAttribute('aria-label', 'Поиск шаблона');
            const template = mobileNode('select', 'm-field');
            template.setAttribute('aria-label', 'Шаблон для вставки');
            const placeholder = mobileNode('option', '', 'Вставить шаблон...');
            placeholder.value = '';
            const flatTemplates = [];
            const appendTemplates = (items, path = '') => items.forEach((item) => {
                if (Array.isArray(item.children)) appendTemplates(item.children, path ? `${path} / ${item.title}` : item.title);
                else flatTemplates.push({ label: path ? `${path} / ${item.title}` : item.title, text: item.text || '' });
            });
            appendTemplates(getTemplates());
            const renderTemplateOptions = () => {
                template.replaceChildren(placeholder);
                const needle = templateSearch.value.trim().toLocaleLowerCase('ru');
                flatTemplates.filter((item) => !needle || `${item.label} ${item.text}`.toLocaleLowerCase('ru').includes(needle)).forEach((item, index) => {
                    const option = mobileNode('option', '', item.label);
                    option.value = String(index + 1);
                    option.okdeskTemplateText = item.text;
                    template.appendChild(option);
                });
            };
            templateSearch.oninput = renderTemplateOptions;
            renderTemplateOptions();
            const textarea = mobileNode('textarea', 'm-field');
            textarea.placeholder = 'Текст комментария'; textarea.setAttribute('aria-label', 'Текст комментария');
            const insertTools = mobileNode('div', 'm-line');
            const templateButton = mobileNode('button', 'm-secondary', 'Шаблон');
            templateButton.type = 'button'; templateButton.setAttribute('aria-expanded', 'false');
            const templateFields = mobileNode('div');
            templateFields.hidden = true;
            templateFields.append(templateSearch, template);
            templateButton.onclick = () => {
                templateFields.hidden = !templateFields.hidden;
                templateButton.setAttribute('aria-expanded', String(!templateFields.hidden));
                if (!templateFields.hidden) templateSearch.focus();
            };
            const mentionButton = mobileNode('button', 'm-secondary', 'Упомянуть сотрудника');
            mentionButton.type = 'button';
            mentionButton.onclick = () => {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const { body, close } = mobileShowSheet('Упомянуть сотрудника');
                const search = mobileNode('input', 'm-field');
                search.type = 'search'; search.placeholder = 'Поиск сотрудника';
                search.setAttribute('aria-label', 'Поиск сотрудника');
                const list = mobileNode('div', 'm-muted', 'Загружаю сотрудников...');
                body.append(search, list);
                getTransferEmployees().then((employees) => {
                    if (!list.isConnected) return;
                    const render = () => {
                        list.replaceChildren();
                        const query = search.value.trim().toLocaleLowerCase('ru');
                        employees.filter((employee) => !query || employee.name.toLocaleLowerCase('ru').includes(query)).forEach((employee) => {
                            mobileSheetChoice(list, employee.name, () => {
                                close();
                                textarea.setRangeText(`[~employee${employee.id}|${employee.name}] `, start, end, 'end');
                                textarea.focus();
                            });
                        });
                        if (!list.children.length) list.textContent = 'Сотрудник не найден.';
                    };
                    search.oninput = render;
                    render();
                }).catch((error) => { if (list.isConnected) list.textContent = `Не удалось загрузить сотрудников: ${error.message}`; });
                search.focus();
            };
            insertTools.append(templateButton, mentionButton);
            template.onchange = () => {
                const value = template.selectedOptions[0]?.okdeskTemplateText || '';
                if (value) {
                    const position = textarea.selectionStart;
                    const prefix = textarea.value && position > 0 && !textarea.value.slice(0, position).endsWith('\n') ? '\n' : '';
                    textarea.setRangeText(`${prefix}${value}`, position, textarea.selectionEnd, 'end');
                    textarea.focus();
                }
                template.value = '';
            };
            const fileInput = mobileNode('input', 'm-field');
            fileInput.type = 'file'; fileInput.multiple = true; fileInput.setAttribute('aria-label', 'Прикрепить файлы');
            fileInput.hidden = true;
            const fileLine = mobileNode('div', 'm-line');
            const fileButton = mobileNode('button', 'm-secondary', '📎 Добавить файлы');
            fileButton.type = 'button'; fileButton.onclick = () => fileInput.click();
            const fileCount = mobileNode('span', 'm-muted', 'Файлы не выбраны');
            fileInput.onchange = () => { fileCount.textContent = fileInput.files.length ? `Выбрано файлов: ${fileInput.files.length}` : 'Файлы не выбраны'; };
            fileLine.append(fileButton, fileCount, fileInput);
            const publicLabel = mobileNode('label', 'm-line');
            const publicInput = mobileNode('input'); publicInput.type = 'checkbox'; publicInput.checked = true;
            publicLabel.append(publicInput, mobileNode('span', '', 'Открытый комментарий'));
            const sendActions = mobileNode('div', 'm-send-actions');
            const send = mobileNode('button', 'm-primary', 'Отправить');
            const sendMore = mobileNode('button', 'm-secondary', '⋯');
            send.type = 'button'; sendMore.type = 'button';
            sendMore.setAttribute('aria-label', 'Другие варианты отправки');
            sendMore.title = 'Другие варианты отправки';
            const feedback = mobileNode('div', 'm-feedback'); feedback.setAttribute('role', 'status');
            let sending = false;
            const sendComment = async (statusCode = '', employee = null) => {
                if (sending) return;
                const text = textarea.value.trim();
                if (!text && !fileInput.files.length) { feedback.textContent = 'Введите текст или приложите файл.'; return; }
                sending = true;
                send.disabled = true; sendMore.disabled = true;
                const isPublic = employee ? false : publicInput.checked;
                if (isPublic && !await mobileConfirm('Отправить открытый комментарий?', 'Клиент увидит этот ответ и вложения.')) {
                    sending = false; send.disabled = false; sendMore.disabled = false;
                    return;
                }
                feedback.textContent = 'Отправляю...';
                try {
                    await sendManualIssueComment({ issueId, text, isPublic, files: [...fileInput.files], statusCode, employee });
                    feedback.textContent = 'Комментарий отправлен.';
                    await mobileLoadIssue(issueId);
                } catch (error) {
                    feedback.textContent = error.commentSent ? `Комментарий отправлен, но следующее действие не выполнено: ${error.message}` : `Не удалось отправить: ${error.message}`;
                    if (!error.commentSent) {
                        sending = false; send.disabled = false; sendMore.disabled = false;
                    }
                }
            };
            send.onclick = () => sendComment();
            sendMore.onclick = () => {
                if (sending) return;
                const { body, close } = mobileShowSheet('Варианты отправки');
                mobileSheetChoice(body, 'Отправить без смены статуса', () => { close(); sendComment(); });
                getSavedIssueStatuses().forEach((status) => {
                    mobileSheetChoice(body, `Отправить и «${status.name}»`, () => { close(); sendComment(status.code); });
                });
                mobileSheetChoice(body, 'Отправить сотруднику и сменить ответственного', async () => {
                    const { body: employeeBody, close: closeEmployee } = mobileShowSheet('Выберите сотрудника');
                    const search = mobileNode('input', 'm-field');
                    search.type = 'search'; search.placeholder = 'Поиск сотрудника';
                    search.setAttribute('aria-label', 'Поиск сотрудника');
                    const list = mobileNode('div', 'm-muted', 'Загружаю сотрудников...');
                    employeeBody.append(search, list);
                    try {
                        const employees = await getTransferEmployees();
                        if (!list.isConnected) return;
                        const render = () => {
                            list.replaceChildren();
                            const query = search.value.trim().toLocaleLowerCase('ru');
                            employees.filter((employee) => !query || employee.name.toLocaleLowerCase('ru').includes(query)).forEach((employee) => {
                                mobileSheetChoice(list, employee.name, () => { closeEmployee(); sendComment('', employee); });
                            });
                            if (!list.children.length) list.textContent = 'Сотрудник не найден.';
                        };
                        search.oninput = render;
                        render();
                    } catch (error) {
                        if (list.isConnected) list.textContent = `Не удалось загрузить сотрудников: ${error.message}`;
                    }
                });
            };
            sendActions.append(send, sendMore);
            compose.append(insertTools, templateFields, textarea, fileLine, publicLabel, sendActions, feedback);
            content.appendChild(compose);
            content.appendChild(commentSection);

            const statusSection = mobileNode('section', 'm-section m-status-section');
            statusSection.dataset.mobileSection = 'status';
            statusSection.appendChild(mobileNode('h2', '', 'Статус заявки'));
            const statusLine = mobileNode('div', 'm-line');
            const statusSelect = mobileNode('select', 'm-field');
            getSavedIssueStatuses().forEach((status) => {
                const option = mobileNode('option', '', status.name);
                option.value = status.code;
                statusSelect.appendChild(option);
            });
            if (issue.status?.code && ![...statusSelect.options].some((option) => option.value === issue.status.code)) {
                const current = mobileNode('option', '', issue.status.name || issue.status.code);
                current.value = issue.status.code; statusSelect.prepend(current);
            }
            statusSelect.value = issue.status?.code || statusSelect.options[0]?.value || '';
            const change = mobileNode('button', 'm-secondary', 'Изменить');
            change.type = 'button';
            const statusFeedback = mobileNode('div', 'm-feedback'); statusFeedback.setAttribute('role', 'status');
            change.onclick = async () => {
                if (!statusSelect.value || statusSelect.value === issue.status?.code) { statusFeedback.textContent = 'Статус уже установлен.'; return; }
                change.disabled = true; statusFeedback.textContent = 'Меняю статус...';
                try {
                    await changeStatus(issueId, GM_getValue(API_TOKEN_KEY, ''), statusSelect.value);
                    await mobileLoadIssue(issueId);
                } catch (error) {
                    statusFeedback.textContent = `Не удалось изменить статус: ${error.message}`;
                    change.disabled = false;
                }
            };
            statusLine.append(statusSelect, change);
            statusSection.append(statusLine, statusFeedback);
            content.prepend(statusSection);
        }

        function mobileConfirm(title, description, confirmLabel = 'Отправить') {
            return new Promise((resolve) => {
                const overlay = mobileNode('div');
                Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2147483648', display: 'grid', placeItems: 'center', padding: '16px', background: 'rgba(0,0,0,.6)' });
                const dialog = mobileNode('div', 'm-section');
                Object.assign(dialog.style, { width: '100%', maxWidth: '420px', borderRadius: '6px' });
                const actions = mobileNode('div', 'm-line');
                Object.assign(actions.style, { justifyContent: 'flex-end', marginTop: '16px' });
                const cancel = mobileNode('button', 'm-secondary', 'Отмена');
                const confirm = mobileNode('button', 'm-primary', confirmLabel);
                const finish = (value) => { overlay.remove(); resolve(value); };
                cancel.onclick = () => finish(false);
                confirm.onclick = () => finish(true);
                actions.append(cancel, confirm);
                dialog.append(mobileNode('h2', '', title), mobileNode('div', 'm-copy', description), actions);
                overlay.appendChild(dialog);
                app.appendChild(overlay);
            });
        }
    }

    function getIssueId() {
        const match = location.pathname.match(/^\/issues\/(\d+)/);
        return match?.[1] || null;
    }

    function handleIssueListContextMenu(event) {
        if (!/^\/issues\/?$/.test(location.pathname) || event.altKey || window.getSelection()?.toString().trim()) return;
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        if (!target || target.closest('[data-okdesk-script-ui]')) return;
        if (target.closest('button, input, textarea, select, [contenteditable="true"]')) return;
        const row = target.closest('tr[data-role^="issue-container-"], tr, [role="row"]');
        const directLink = target.closest('a[href]');
        const link = directLink || row?.querySelector('a[href^="/issues/"]');
        const url = link ? new URL(link.href, location.href) : null;
        const linkIssueId = url?.origin === location.origin && url.pathname.match(/^\/issues\/(\d+)\/?$/)?.[1];
        if (directLink && !linkIssueId) return;
        const issueId = linkIssueId || row?.getAttribute('data-role')?.match(/^issue-container-(\d+)$/)?.[1];
        if (!issueId) return;
        event.preventDefault();
        event.stopPropagation();
        showIssueListPreview(issueId, `${location.origin}/issues/${issueId}`, event.clientX, event.clientY);
    }

    function closeIssueListPreview() {
        issueListPreview?.remove();
        issueListPreview = null;
    }

    function showIssueListPreview(issueId, issueUrl, x, y) {
        closeIssueListPreview();
        const popup = document.createElement('div');
        popup.dataset.okdeskScriptUi = 'true';
        Object.assign(popup.style, {
            position: 'fixed', zIndex: '2147483647', width: '390px', maxWidth: 'calc(100vw - 16px)',
            maxHeight: 'calc(100vh - 16px)', overflowY: 'auto', padding: '14px', boxSizing: 'border-box',
            border: '1px solid var(--okdesk-script-border)', borderRadius: '6px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)',
            boxShadow: '0 12px 32px rgba(0,0,0,.45)', font: '13px Arial, sans-serif',
        });
        const heading = document.createElement('div');
        Object.assign(heading.style, { position: 'sticky', top: '-14px', zIndex: '1', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 0', background: 'var(--okdesk-script-surface)' });
        const issueLink = document.createElement('a');
        issueLink.href = issueUrl;
        issueLink.textContent = `Заявка №${issueId}`;
        Object.assign(issueLink.style, { flex: '1', minWidth: '0', color: 'var(--okdesk-script-link)', fontWeight: '600', textDecoration: 'none' });
        const close = document.createElement('button');
        close.type = 'button'; close.textContent = '×'; close.title = 'Закрыть';
        Object.assign(close.style, { width: '28px', height: '28px', flex: '0 0 28px', border: '1px solid var(--okdesk-script-border)', borderRadius: '4px', background: 'transparent', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
        close.onclick = closeIssueListPreview;
        heading.append(issueLink, close);

        const commentTitle = document.createElement('div');
        commentTitle.textContent = 'Последний комментарий';
        Object.assign(commentTitle.style, { marginBottom: '6px', color: 'var(--okdesk-script-muted)', fontSize: '12px' });
        const commentMeta = document.createElement('div');
        Object.assign(commentMeta.style, { marginBottom: '5px', color: 'var(--okdesk-script-muted)', fontSize: '11px' });
        const commentText = document.createElement('div');
        commentText.textContent = 'Загружаю...';
        Object.assign(commentText.style, {
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: '3', overflow: 'hidden',
            minHeight: '18px', lineHeight: '1.45', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
        });
        const comment = document.createElement('div');
        Object.assign(comment.style, { padding: '10px', border: '1px solid var(--okdesk-script-border-card)', borderRadius: '4px', background: 'var(--okdesk-script-field)' });
        comment.append(commentTitle, commentMeta, commentText);

        const buttons = document.createElement('div');
        Object.assign(buttons.style, { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', marginTop: '12px' });
        getQuickReplies().forEach((reply, index) => {
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = reply.title;
            button.title = `${reply.public === false ? 'Скрытый' : 'Открытый'} комментарий · ${getStatusLabel(reply.statusCode)}`;
            const color = getQuickReplyColor(reply, index);
            Object.assign(button.style, {
                height: '34px', minWidth: '0', padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                border: `1px solid ${color}`, borderLeft: `4px solid ${color}`, borderRadius: '4px',
                background: `${color}24`, color: 'var(--okdesk-script-text)', cursor: 'pointer', fontSize: '12px',
            });
            button.addEventListener('click', async () => {
                if (await runQuickReply(reply, popup, issueId)) closeIssueListPreview();
            });
            buttons.appendChild(button);
        });
        if (!buttons.children.length) {
            buttons.textContent = 'Быстрые ответы не настроены.';
            buttons.style.display = 'block';
        }
        const manual = document.createElement('details');
        manual.dataset.role = 'issue-list-manual-reply';
        manual.open = GM_getValue(ISSUE_LIST_MANUAL_OPEN_KEY, 'closed') === 'open';
        manual.addEventListener('toggle', () => {
            GM_setValue(ISSUE_LIST_MANUAL_OPEN_KEY, manual.open ? 'open' : 'closed');
            requestAnimationFrame(() => {
                if (!popup.isConnected) return;
                keepMenuInViewport(popup, x, y);
                popup.scrollTop = manual.open ? Math.max(0, manual.offsetTop - popup.offsetTop - 8) : 0;
            });
        });
        Object.assign(manual.style, { marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--okdesk-script-border)' });
        const manualTitle = document.createElement('summary');
        manualTitle.textContent = 'Ответить вручную';
        Object.assign(manualTitle.style, { cursor: 'pointer', fontWeight: '600' });
        const manualBody = document.createElement('div');
        manualBody.style.paddingTop = '10px';
        const textInput = document.createElement('textarea');
        textInput.rows = 4;
        textInput.placeholder = 'Текст комментария';
        textInput.setAttribute('aria-label', 'Текст комментария для заявки');
        Object.assign(textInput.style, { display: 'block', width: '100%', minHeight: '76px', padding: '8px', boxSizing: 'border-box', border: '1px solid var(--okdesk-script-border)', borderRadius: '4px', background: 'var(--okdesk-script-field)', color: 'var(--okdesk-script-text)', resize: 'vertical', font: '13px Arial,sans-serif' });
        const privateLabel = document.createElement('label');
        Object.assign(privateLabel.style, { display: 'flex', alignItems: 'center', gap: '7px', margin: '10px 0' });
        const privateInput = document.createElement('input');
        privateInput.type = 'checkbox';
        privateLabel.append(privateInput, document.createTextNode('Скрытый комментарий'));
        const actionSelect = document.createElement('select');
        actionSelect.setAttribute('aria-label', 'Действие при отправке комментария');
        [['', 'Отправить без смены статуса'], ...getSavedIssueStatuses().map((status) => [`status:${status.code}`, `Отправить и «${status.name}»`]), ['transfer', 'Отправить сотруднику и сменить ответственного']].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value; option.textContent = label; actionSelect.appendChild(option);
        });
        const employeeSelect = document.createElement('select');
        employeeSelect.setAttribute('aria-label', 'Сотрудник для передачи заявки');
        employeeSelect.hidden = true;
        [actionSelect, employeeSelect].forEach((select) => Object.assign(select.style, { width: '100%', minHeight: '36px', margin: '0 0 8px', padding: '6px', boxSizing: 'border-box', border: '1px solid var(--okdesk-script-border)', borderRadius: '4px', background: 'var(--okdesk-script-field)', color: 'var(--okdesk-script-text)' }));
        const send = document.createElement('button');
        send.type = 'button'; send.textContent = 'Отправить';
        Object.assign(send.style, { minHeight: '36px', padding: '7px 12px', border: '1px solid #438d71', borderRadius: '4px', background: 'var(--okdesk-script-primary)', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
        const feedback = document.createElement('div');
        feedback.setAttribute('role', 'status');
        Object.assign(feedback.style, { marginTop: '7px', color: 'var(--okdesk-script-danger)', fontSize: '12px', overflowWrap: 'anywhere' });
        let privateBeforeTransfer = false;
        actionSelect.onchange = async () => {
            const transfer = actionSelect.value === 'transfer';
            if (transfer) {
                privateBeforeTransfer = privateInput.checked;
                privateInput.checked = true; privateInput.disabled = true;
                employeeSelect.hidden = false;
                employeeSelect.replaceChildren(new Option('Загружаю сотрудников...', ''));
                try {
                    const employees = await getTransferEmployees();
                    employeeSelect.replaceChildren(new Option('Выберите сотрудника', ''), ...employees.map((employee) => new Option(employee.name, String(employee.id))));
                } catch (error) {
                    employeeSelect.replaceChildren(new Option('Сотрудники недоступны', ''));
                    feedback.textContent = `Не удалось загрузить сотрудников: ${error.message}`;
                }
            } else {
                if (privateInput.disabled) privateInput.checked = privateBeforeTransfer;
                privateInput.disabled = false;
                employeeSelect.hidden = true;
                feedback.textContent = '';
            }
        };
        send.onclick = async () => {
            const text = textInput.value.trim();
            if (!text) { feedback.textContent = 'Введите текст комментария.'; return; }
            const transfer = actionSelect.value === 'transfer';
            const employee = transfer && Number(employeeSelect.value) > 0
                ? { id: Number(employeeSelect.value), name: employeeSelect.selectedOptions[0].textContent }
                : null;
            if (transfer && !employee) { feedback.textContent = 'Выберите сотрудника для передачи.'; return; }
            if (!privateInput.checked && !await confirmPublicQuickReply(null, 'Клиент увидит этот комментарий в заявке.')) return;
            send.disabled = true;
            feedback.textContent = 'Отправляю...';
            try {
                await sendManualIssueComment({ issueId, text, isPublic: !privateInput.checked, statusCode: actionSelect.value.startsWith('status:') ? actionSelect.value.slice(7) : '', employee });
                closeIssueListPreview();
                showToast(transfer ? `Комментарий отправлен, заявка передана: ${employee.name}.` : 'Комментарий отправлен.');
                if (GM_getValue(RELOAD_AFTER_UPDATE_KEY, true)) window.setTimeout(() => location.reload(), 700);
            } catch (error) {
                feedback.textContent = error.commentSent ? `Комментарий отправлен, но следующее действие не выполнено: ${error.message}` : `Не удалось отправить: ${error.message}`;
                if (!error.commentSent) send.disabled = false;
            }
        };
        manualBody.append(textInput, privateLabel, actionSelect, employeeSelect, send, feedback);
        manual.append(manualTitle, manualBody);
        popup.append(heading, comment, buttons, manual);
        document.body.appendChild(popup);
        issueListPreview = popup;
        keepMenuInViewport(popup, x, y);
        loadIssueListLastComment(issueId, popup, commentMeta, commentText);
    }

    async function loadIssueListLastComment(issueId, popup, meta, text) {
        try {
            const response = await apiRequest(`/issues/${issueId}/comments`);
            if (!popup.isConnected) return;
            const comments = Array.isArray(response) ? response : response?.data;
            if (!Array.isArray(comments)) throw new Error('неожиданный ответ API');
            const last = comments.reduce((latest, item) => {
                if (!latest) return item;
                const timestamp = (comment) => Date.parse(comment.published_at || comment.created_at || '') || Number(comment.id) || 0;
                return timestamp(item) >= timestamp(latest) ? item : latest;
            }, null);
            if (!last) {
                text.textContent = 'Комментариев пока нет.';
                return;
            }
            const published = last.published_at || last.created_at;
            const date = published ? new Date(published) : null;
            meta.textContent = [last.author?.name, date && !Number.isNaN(date.getTime()) ? date.toLocaleString('ru-RU') : '', last.public === false ? 'Скрытый' : 'Открытый']
                .filter(Boolean).join(' · ');
            const parsed = new DOMParser().parseFromString(String(last.content || ''), 'text/html');
            parsed.querySelectorAll('script, style').forEach((node) => node.remove());
            parsed.body.querySelectorAll('br').forEach((node) => node.replaceWith(' '));
            parsed.body.querySelectorAll('p, div, li').forEach((node) => node.append(' '));
            const content = (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
            text.textContent = content || (last.attachments?.length ? `Вложения: ${last.attachments.length}` : 'Комментарий без текста');
        } catch (error) {
            if (popup.isConnected) text.textContent = `Не удалось загрузить комментарий: ${error.message}`;
        }
    }

    function getIssueEquipmentNames(equipmentId = '') {
        const equipmentLinks = [...document.querySelectorAll('a[href*="/equipments/"]')]
            .filter((link) => isVisible(link) && /\/equipments\/\d+(?:\/|$)/.test(link.pathname || ''));
        const namesById = new Map();
        equipmentLinks.forEach((link) => {
            const id = (link.pathname.match(/\/equipments\/(\d+)/) || [])[1];
            const name = (link.textContent || '').replace(/\s+/g, ' ').trim();
            if (id && name && (!equipmentId || id === equipmentId)) namesById.set(id, name);
        });
        return [...namesById.values()];
    }

    async function getIssueEquipmentName(issue) {
        let equipmentId = '';
        if (Object.prototype.hasOwnProperty.call(issue || {}, 'equipment_ids')) {
            const rawIds = Array.isArray(issue.equipment_ids) ? issue.equipment_ids : [issue.equipment_ids];
            const ids = rawIds.map((id) => String(id || '').trim()).filter((id) => /^\d+$/.test(id));
            if (ids.length !== 1) return { name: '', ready: true };
            equipmentId = ids[0];
            try {
                const equipment = await apiRequest(`/equipments/${equipmentId}`);
                const name = String(equipment?.type || equipment?.equipment_kind?.name || '').trim();
                if (name) return { name, ready: true };
            } catch (error) {
                console.warn('Okdesk equipment title: cannot load equipment', error);
            }
        }
        const names = getIssueEquipmentNames(equipmentId);
        return { name: names.length === 1 ? names[0] : '', ready: names.length === 1 };
    }

    function normalizeTitlePrefix(value) {
        return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru');
    }

    function getTitleNormalizationSkipPrefix() {
        return String(GM_getValue(TITLE_NORMALIZATION_SKIP_PREFIX_KEY, '!')).trim();
    }

    function isTitleNormalizationEnabled() {
        return GM_getValue(TITLE_NORMALIZATION_ENABLED_KEY, true) !== false;
    }

    function isTitleNormalizationOnlyAssigned() {
        return GM_getValue(TITLE_NORMALIZATION_ONLY_ASSIGNED_KEY, false) === true;
    }

    function isTitleNormalizationOnceEnabled() {
        return GM_getValue(TITLE_NORMALIZATION_ONCE_KEY, false) === true;
    }

    function getCompletedTitleNormalizations() {
        try {
            const saved = JSON.parse(GM_getValue(TITLE_NORMALIZATION_DONE_KEY, '{}'));
            return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
        } catch (_) {
            return {};
        }
    }

    function wasTitleNormalizationApplied(issueId) {
        return Boolean(getCompletedTitleNormalizations()[String(issueId)]);
    }

    function markTitleNormalizationApplied(issueId) {
        const completed = getCompletedTitleNormalizations();
        completed[String(issueId)] = Date.now();
        const recent = Object.entries(completed)
            .sort((left, right) => Number(right[1]) - Number(left[1]))
            .slice(0, 500);
        GM_setValue(TITLE_NORMALIZATION_DONE_KEY, JSON.stringify(Object.fromEntries(recent)));
    }

    async function canAutoChangeIssueTitle(issue) {
        if (!isTitleNormalizationOnlyAssigned()) return true;
        const assigneeId = Number(issue?.assignee?.id || issue?.assignee_id || 0);
        if (!Number.isInteger(assigneeId) || assigneeId <= 0) return false;
        const currentEmployeeId = await getPrivateCommentAuthorId(getTransferSettings());
        return assigneeId === currentEmployeeId;
    }

    function getEmailDomainLabels() {
        const savedRules = GM_getValue(EMAIL_DOMAIN_TITLE_RULES_KEY, null);
        if (savedRules !== null) {
            try {
                const parsed = JSON.parse(savedRules);
                if (Array.isArray(parsed)) {
                    return parsed.map((rule) => ({
                        domain: String(rule?.domain || '').trim().toLowerCase().replace(/^@/, '').replace(/^\./, ''),
                        label: String(rule?.label || '').trim(),
                    })).filter((rule) => rule.domain && rule.label);
                }
            } catch (_) {
                // Continue with rules from version 1.7.2 or the default rule below.
            }
        }
        const legacyRules = String(GM_getValue(INTERNAL_EMAIL_DOMAINS_KEY, ''))
            .split(/\r?\n/)
            .map((line) => {
                const [domain, ...labelParts] = line.split('|');
                const normalizedDomain = String(domain || '').trim().toLowerCase().replace(/^@/, '').replace(/^\./, '');
                const label = labelParts.join('|').trim() || (normalizedDomain ? 'от сотрудника' : '');
                return normalizedDomain && label ? { domain: normalizedDomain, label } : null;
            })
            .filter(Boolean);
        return legacyRules.length ? legacyRules : DEFAULT_EMAIL_DOMAIN_TITLE_RULES.map((rule) => ({ ...rule }));
    }

    function saveEmailDomainLabels(rules) {
        const normalized = rules.map((rule) => ({
            domain: String(rule?.domain || '').trim().toLowerCase().replace(/^@/, '').replace(/^\./, ''),
            label: String(rule?.label || '').trim(),
        })).filter((rule) => rule.domain && rule.label);
        GM_setValue(EMAIL_DOMAIN_TITLE_RULES_KEY, JSON.stringify(normalized));
    }

    function getIssueContactEmails(issue) {
        const entities = [
            issue, issue?.data, issue?.contact, issue?.contact?.data, issue?.contact?.contact,
            issue?.author, issue?.author?.data, issue?.client, issue?.client?.data,
            issue?.customer, issue?.customer?.data, issue?.company, issue?.company?.data,
        ].filter(Boolean);
        const values = entities.flatMap((entity) => [
            entity?.email, entity?.emails, entity?.user_email, entity?.email_address,
            entity?.mail, entity?.primary_email, entity?.additional_emails,
            entity?.cc_email, entity?.contacts,
        ]);
        return values.flatMap((value) => Array.isArray(value) ? value : [value])
            .flatMap((value) => value && typeof value === 'object'
                ? [value.email, value.address, value.value, value.user_email, value.email_address] : [value])
            .flatMap((value) => String(value || '').toLowerCase().split(/[,;\s]+/))
            .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    }

    async function getIssueDomainLabel(issue) {
        const domainLabels = getEmailDomainLabels();
        if (!domainLabels.length) return '';
        const findLabel = (emails) => emails.map((email) => {
            const domain = email.split('@')[1];
            return domainLabels.find((rule) => domain === rule.domain || domain.endsWith(`.${rule.domain}`))?.label || '';
        }).find(Boolean) || '';
        const contact = issue?.contact || issue?.data?.contact;
        const contactId = contact?.id || issue?.contact_id || issue?.data?.contact_id
            || (issue?.author?.type === 'contact' ? issue.author.id : null);
        if (contactId) {
            try {
                const contactDetails = await apiRequest(`/contacts/?id=${encodeURIComponent(contactId)}`);
                return findLabel(getIssueContactEmails(contactDetails));
            } catch (error) {
                console.warn('Okdesk equipment title: cannot load contact email', error);
            }
            return findLabel(getIssueContactEmails({ contact }));
        }
        const label = findLabel(getIssueContactEmails({ contact }));
        if (label) return label;
        const companyId = issue?.company?.id || issue?.company_id || issue?.data?.company?.id || issue?.data?.company_id;
        if (companyId) {
            try {
                const company = await apiRequest(`/companies/?id=${encodeURIComponent(companyId)}`);
                return findLabel(getIssueContactEmails(company));
            } catch (error) {
                console.warn('Okdesk equipment title: cannot load company email', error);
            }
        }
        return '';
    }

    function buildEquipmentIssueTitle(title, equipmentName, domainLabel) {
        const normalizedEquipment = normalizeTitlePrefix(equipmentName);
        const normalizedDomainLabel = normalizeTitlePrefix(domainLabel);
        let topic = String(title || '').trim();

        // Remove every existing generated prefix. This makes the operation idempotent
        // and repairs titles that were duplicated by earlier retry attempts.
        const parts = topic.split('|').map((part) => part.trim()).filter(Boolean);
        let prefixRemoved = false;
        while (parts.length) {
            const firstPart = normalizeTitlePrefix(parts[0]);
            if (normalizedEquipment && firstPart === normalizedEquipment) {
                parts.shift();
                prefixRemoved = true;
                continue;
            }
            if (normalizedDomainLabel && firstPart === normalizedDomainLabel) {
                parts.shift();
                prefixRemoved = true;
                continue;
            }
            break;
        }
        if (prefixRemoved) {
            topic = parts.join(' | ');
        } else if (normalizedEquipment) {
            const normalizedTitle = normalizeTitlePrefix(topic);
            const startsWithEquipment = normalizedTitle === normalizedEquipment
                || normalizedTitle.startsWith(`${normalizedEquipment} `);
            if (startsWithEquipment) {
                topic = topic.slice(equipmentName.length).trim();
            }
        }
        return [equipmentName, domainLabel, topic].filter(Boolean).join(' | ');
    }

    function hasDomainLabelNearStart(title, domainLabel) {
        const normalizedLabel = normalizeTitlePrefix(domainLabel);
        return Boolean(normalizedLabel) && String(title || '').split('|').slice(0, 2)
            .some((part) => normalizeTitlePrefix(part) === normalizedLabel);
    }

    function scheduleEquipmentTitleNormalization() {
        const issueId = getIssueId();
        if (!issueId) return;
        if (equipmentTitleNormalizationIssueId !== issueId) {
            equipmentTitleNormalizationIssueId = issueId;
            equipmentTitleNormalizationAttempts = 0;
            equipmentTitleNormalizationCompleted = false;
            equipmentTitleNormalizationRetryAt = 0;
        }
        if (equipmentTitleNormalizationCompleted || equipmentTitleNormalizationInFlight) return;
        if (Date.now() < equipmentTitleNormalizationRetryAt) return;
        if (!isTitleNormalizationEnabled()) return;
        if (!GM_getValue(API_TOKEN_KEY, '')) return;
        if (isTitleNormalizationOnceEnabled() && wasTitleNormalizationApplied(issueId)) {
            equipmentTitleNormalizationCompleted = true;
            return;
        }
        equipmentTitleNormalizationInFlight = true;
        void normalizeIssueTitleWithEquipment(issueId);
    }

    async function normalizeIssueTitleWithEquipment(issueId) {
        let titleUpdated = false;
        let equipmentName = '';
        let equipmentReady = false;
        try {
            const issue = await apiRequest(`/issues/${issueId}`);
            if (getIssueId() !== issueId) return;
            if (!await canAutoChangeIssueTitle(issue)) return;

            const title = String(issue?.title || '').trim();
            if (!title) return;
            const skipPrefix = getTitleNormalizationSkipPrefix();
            if (skipPrefix && title.startsWith(skipPrefix)) return;
            const [domainLabel, equipment] = await Promise.all([
                getIssueDomainLabel(issue),
                getIssueEquipmentName(issue),
            ]);
            if (getIssueId() !== issueId) return;
            equipmentName = equipment.name;
            equipmentReady = equipment.ready;
            // Save only after both prefixes are known. An empty equipment field in the
            // API is definitive; an equipment link still loading in the page is not.
            if (!equipmentReady) return;
            // Keep a known equipment prefix when the DOM temporarily has no equipment link.
            if (!equipmentName && hasDomainLabelNearStart(title, domainLabel)) return;
            const updatedTitle = buildEquipmentIssueTitle(title, equipmentName, domainLabel);
            if (normalizeTitlePrefix(updatedTitle) === normalizeTitlePrefix(title)) return;
            if (updatedTitle.length > 500) {
                showToast('Тема не дополнена: итоговое название длиннее 500 символов.', true);
                return;
            }
            await apiRequest(`/issues/${issueId}`, {
                method: 'PATCH',
                body: { issue: { title: updatedTitle } },
            });
            titleUpdated = true;
            if (isTitleNormalizationOnceEnabled()) markTitleNormalizationApplied(issueId);
            showToast('Тема заявки дополнена.');
            window.setTimeout(() => {
                if (getIssueId() === issueId) location.reload();
            }, 550);
        } catch (error) {
            console.warn('Okdesk equipment title:', error);
            showToast(`Не удалось дополнить тему оборудованием: ${error.message}`, true);
        } finally {
            equipmentTitleNormalizationInFlight = false;
            equipmentTitleNormalizationAttempts += 1;
            // Okdesk renders the equipment field after the page shell. Retry briefly so the
            // first empty DOM read does not permanently skip a later-rendered equipment.
            if (!titleUpdated && !equipmentReady && equipmentTitleNormalizationAttempts < 8 && getIssueId() === issueId) {
                equipmentTitleNormalizationRetryAt = Date.now() + 700;
                window.setTimeout(scheduleEquipmentTitleNormalization, 700);
            } else {
                equipmentTitleNormalizationCompleted = true;
            }
        }
    }

    function addQuickIssueOpenButtons() {
        const selectors = [
            'input[type="search"]',
            'input[placeholder*="Поиск"]',
            'input[placeholder*="поиск"]',
            'input[aria-label*="Поиск"]',
            'input[aria-label*="поиск"]',
            'input[name*="search" i]',
        ];
        const inputs = [...document.querySelectorAll(selectors.join(','))]
            .filter((input) => {
                const label = `${input.placeholder || ''} ${input.getAttribute('aria-label') || ''}`.toLowerCase();
                // Поиск по номеру или теме является фильтром списка, а не общим поиском в шапке.
                return isVisible(input)
                    && !input.dataset.okdeskQuickIssueButton
                    && !input.closest('[data-okdesk-script-ui]')
                    && !/поиск\s+по\s+номеру|номеру|теме/.test(label);
            });
        inputs.forEach((input) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'okdesk-quick-issue-open';
            button.textContent = '↗ В заявку';
            button.title = 'Открыть заявку по номеру из строки поиска';
            Object.assign(button.style, {
                marginLeft: '6px', padding: '6px 9px', border: '1px solid #3d7196', borderRadius: '4px',
                background: 'var(--okdesk-script-secondary)', color: 'var(--okdesk-script-text)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px',
            });

            const getIssueNumber = () => {
                const match = input.value.trim().match(/^0*(\d+)$/);
                return match?.[1] || '';
            };
            const updateState = () => {
                const issueNumber = getIssueNumber();
                button.disabled = !issueNumber;
                button.style.opacity = issueNumber ? '1' : '.45';
                button.style.cursor = issueNumber ? 'pointer' : 'not-allowed';
            };
            input.addEventListener('input', updateState);
            button.addEventListener('click', () => {
                const issueNumber = getIssueNumber();
                if (issueNumber) location.assign(`${location.origin}/issues/${issueNumber}`);
            });
            input.insertAdjacentElement('afterend', button);
            input.dataset.okdeskQuickIssueButton = 'true';
            updateState();
        });
    }

    function openSettings() {
        const currentToken = GM_getValue(API_TOKEN_KEY, '');
        const reloadAfterUpdate = GM_getValue(RELOAD_AFTER_UPDATE_KEY, true);
        const quickReplyPanelPosition = getQuickReplyPanelPosition();
        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div id="okdesk-settings-dialog">
                <h3>Настройки скрипта Okdesk</h3>
                <div class="okdesk-settings-section-title">Разделы</div>
                <div class="okdesk-settings-sections">
                    <button data-action="quick-replies">Быстрые ответы</button>
                    <button data-action="templates">Шаблоны для вставки</button>
                    <button data-action="transfer">Передача заявок</button>
                    <button data-action="domain-rules">Изменение темы заявки</button>
                </div>
                <div class="okdesk-settings-section-title">Перенос шаблонов</div>
                <div class="okdesk-settings-sections">
                    <button data-action="export-templates">Экспорт в JSON</button>
                    <button data-action="import-templates">Импорт из JSON</button>
                </div>
                <div id="okdesk-settings-import-result" role="status" aria-live="polite" hidden></div>
                <div class="okdesk-settings-section-title">Общие настройки</div>
                <label class="okdesk-settings-token-label">API-токен<br><input id="okdesk-settings-token" type="password" autocomplete="off"></label>
                <div class="okdesk-settings-token-actions">
                    <button data-action="delete">Удалить токен</button>
                </div>
                <label class="okdesk-settings-check"><input id="okdesk-settings-reload" type="checkbox"> Обновлять страницу после изменения</label>
                <label class="okdesk-settings-token-label">Тема интерфейса скрипта<br>
                    <select id="okdesk-settings-theme">
                        <option value="auto">Автоматически, как в Okdesk</option>
                        <option value="dark">Тёмная</option>
                        <option value="light">Светлая</option>
                    </select>
                </label>
                <label class="okdesk-settings-token-label">Расположение панели быстрых ответов<br>
                    <select id="okdesk-settings-quick-reply-position">
                        <option value="header">В шапке заявки</option>
                        <option value="after-description">После описания, перед вкладками комментариев</option>
                        <option value="after-comments">После вкладок комментариев, перед лентой</option>
                        <option value="fixed-top">Закрепить под верхней панелью</option>
                    </select>
                </label>
                <div class="okdesk-settings-actions">
                    <button data-action="cancel">Отмена</button>
                    <button data-action="save">Сохранить</button>
                </div>
            </div>
        `;
        Object.assign(dialog.style, {
            position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid', placeItems: 'center', overflowY: 'auto', padding: '16px', boxSizing: 'border-box',
            background: 'rgba(0,0,0,.55)', font: '14px Arial, sans-serif',
        });
        const box = dialog.querySelector('#okdesk-settings-dialog');
        Object.assign(box.style, {
            width: '440px', maxWidth: '100%', boxSizing: 'border-box', margin: 'auto', padding: '18px', borderRadius: '8px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)',
            boxShadow: '0 10px 32px rgba(0,0,0,.45)',
        });
        Object.assign(box.querySelector('h3').style, { margin: '0 0 18px' });
        box.querySelectorAll('.okdesk-settings-section-title').forEach((heading, index) => {
            Object.assign(heading.style, { margin: index ? '18px 0 10px' : '0 0 10px', color: 'var(--okdesk-script-muted)', fontSize: '12px', fontWeight: '600' });
        });
        Object.assign(box.querySelector('.okdesk-settings-sections').style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '8px' });
        box.querySelectorAll('.okdesk-settings-sections button').forEach((button) => {
            Object.assign(button.style, { minHeight: '38px', padding: '7px 10px', textAlign: 'left', border: '1px solid var(--okdesk-script-border-soft)', borderRadius: '4px', background: 'var(--okdesk-script-raised)', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
        });
        Object.assign(box.querySelector('#okdesk-settings-import-result').style, {
            marginTop: '10px', padding: '10px 12px', border: '1px solid #4d9b87', borderRadius: '4px',
            background: 'var(--okdesk-script-success-bg)', color: 'var(--okdesk-script-success-text)', lineHeight: '1.4',
        });
        const tokenInput = box.querySelector('#okdesk-settings-token');
        tokenInput.value = currentToken;
        Object.assign(tokenInput.style, { width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '8px' });
        box.querySelector('#okdesk-settings-reload').checked = reloadAfterUpdate;
        const themeInput = box.querySelector('#okdesk-settings-theme');
        themeInput.value = GM_getValue(SCRIPT_THEME_KEY, 'auto');
        Object.assign(themeInput.style, { width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '8px', background: 'var(--okdesk-script-raised)', color: 'var(--okdesk-script-text)', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '4px' });
        const quickReplyPanelPositionInput = box.querySelector('#okdesk-settings-quick-reply-position');
        quickReplyPanelPositionInput.value = quickReplyPanelPosition;
        Object.assign(quickReplyPanelPositionInput.style, { width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '8px', background: 'var(--okdesk-script-raised)', color: 'var(--okdesk-script-text)', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '4px' });
        Object.assign(box.querySelector('.okdesk-settings-token-actions').style, { display: 'flex', justifyContent: 'flex-end', marginTop: '6px' });
        Object.assign(box.querySelector('[data-action="delete"]').style, { border: '0', padding: '4px 0', background: 'transparent', color: 'var(--okdesk-script-danger)', cursor: 'pointer' });
        Object.assign(box.querySelector('.okdesk-settings-check').style, { display: 'block', marginTop: '12px' });
        Object.assign(box.querySelector('.okdesk-settings-actions').style, { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--okdesk-script-border-soft)' });
        Object.assign(box.querySelector('[data-action="save"]').style, { padding: '7px 12px', border: '1px solid #4d9b87', borderRadius: '4px', background: 'var(--okdesk-script-primary-alt)', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
        Object.assign(box.querySelector('[data-action="cancel"]').style, { padding: '7px 12px', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '4px', background: 'transparent', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
        document.body.appendChild(dialog);
        tokenInput.focus();

        box.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (action === 'quick-replies') {
                openQuickReplySettings('quick');
                return;
            }
            if (action === 'templates') {
                openTemplateSettings();
                return;
            }
            if (action === 'transfer') {
                openTransferSettings();
                return;
            }
            if (action === 'domain-rules') {
                openEmailDomainRulesSettings();
                return;
            }
            if (action === 'export-templates') {
                exportTemplateBundle();
                return;
            }
            if (action === 'import-templates') {
                importTemplateBundle(box.querySelector('#okdesk-settings-import-result'));
                return;
            }
            if (action === 'save') {
                GM_setValue(API_TOKEN_KEY, tokenInput.value.trim());
                GM_setValue(RELOAD_AFTER_UPDATE_KEY, box.querySelector('#okdesk-settings-reload').checked);
                GM_setValue(SCRIPT_THEME_KEY, themeInput.value);
                applyScriptTheme();
                GM_setValue(QUICK_REPLY_PANEL_POSITION_KEY, quickReplyPanelPositionInput.value);
                document.getElementById('okdesk-quick-replies-panel')?.remove();
                addQuickReplyPanel();
                showToast('Настройки сохранены.');
            } else if (action === 'delete') {
                GM_setValue(API_TOKEN_KEY, '');
                showToast('API-токен удалён из Tampermonkey.');
            }
            dialog.remove();
        }));
    }

    function openEmailDomainRulesSettings() {
        const dialog = document.createElement('div');
        Object.assign(dialog.style, { position: 'fixed', inset: '0', zIndex: '2147483648', overflow: 'auto', background: 'rgba(0,0,0,.6)', font: '14px Arial,sans-serif' });
        const box = document.createElement('div');
        Object.assign(box.style, { width: '680px', maxWidth: 'calc(100% - 32px)', margin: '40px auto', padding: '18px', borderRadius: '8px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)' });
        dialog.appendChild(box);
        document.body.appendChild(dialog);
        const rules = getEmailDomainLabels().map((rule) => ({ ...rule }));
        const settings = {
            enabled: isTitleNormalizationEnabled(),
            onlyAssigned: isTitleNormalizationOnlyAssigned(),
            onlyOnce: isTitleNormalizationOnceEnabled(),
            skipPrefix: getTitleNormalizationSkipPrefix(),
        };

        const render = () => {
            box.replaceChildren();
            const title = document.createElement('h3');
            title.textContent = 'Изменение темы заявки';
            title.style.marginTop = '0';
            const note = document.createElement('p');
            note.textContent = 'При совпадении e-mail обратившегося текст добавляется после названия оборудования.';
            note.style.color = 'var(--okdesk-script-muted-soft)';
            const enabled = document.createElement('label');
            enabled.style.display = 'block';
            enabled.style.margin = '14px 0 0';
            const enabledInput = document.createElement('input');
            enabledInput.type = 'checkbox'; enabledInput.checked = settings.enabled;
            enabledInput.onchange = () => { settings.enabled = enabledInput.checked; };
            enabled.append(enabledInput, document.createTextNode(' Автоматически дополнять тему оборудованием'));
            const onlyAssigned = document.createElement('label');
            onlyAssigned.style.display = 'block';
            onlyAssigned.style.margin = '8px 0 0';
            const onlyAssignedInput = document.createElement('input');
            onlyAssignedInput.type = 'checkbox'; onlyAssignedInput.checked = settings.onlyAssigned;
            onlyAssignedInput.onchange = () => { settings.onlyAssigned = onlyAssignedInput.checked; };
            onlyAssigned.append(onlyAssignedInput, document.createTextNode(' Изменять только заявки, назначенные на меня'));
            const onlyAssignedHint = document.createElement('small');
            onlyAssignedHint.textContent = 'Сотрудник определяется по ID автора в настройках передачи или по владельцу API-токена.';
            Object.assign(onlyAssignedHint.style, { display: 'block', margin: '4px 0 0 20px', color: 'var(--okdesk-script-muted-soft)' });
            const onlyOnce = document.createElement('label');
            onlyOnce.style.display = 'block';
            onlyOnce.style.margin = '8px 0 0';
            const onlyOnceInput = document.createElement('input');
            onlyOnceInput.type = 'checkbox'; onlyOnceInput.checked = settings.onlyOnce;
            onlyOnceInput.onchange = () => { settings.onlyOnce = onlyOnceInput.checked; };
            onlyOnce.append(onlyOnceInput, document.createTextNode(' Не изменять заявку повторно'));
            const onlyOnceHint = document.createElement('small');
            onlyOnceHint.textContent = 'Хранит локально до 500 заявок. При выключении тема сверяется при каждом открытии.';
            Object.assign(onlyOnceHint.style, { display: 'block', margin: '4px 0 0 20px', color: 'var(--okdesk-script-muted-soft)' });
            const skipPrefix = document.createElement('input');
            skipPrefix.type = 'text'; skipPrefix.value = settings.skipPrefix; skipPrefix.maxLength = 60;
            skipPrefix.placeholder = '! или ⛔ или Не менять:';
            Object.assign(skipPrefix.style, { width: '100%', boxSizing: 'border-box', marginTop: '5px', padding: '7px' });
            skipPrefix.oninput = () => { settings.skipPrefix = skipPrefix.value; };
            const skipPrefixLabel = document.createElement('label');
            skipPrefixLabel.textContent = 'Префикс запрета автоизменения темы';
            Object.assign(skipPrefixLabel.style, { display: 'block', marginTop: '12px' });
            skipPrefixLabel.append(document.createElement('br'), skipPrefix);
            const sectionTitle = document.createElement('h4');
            sectionTitle.textContent = 'Правила доменов e-mail';
            Object.assign(sectionTitle.style, { margin: '18px 0 0', paddingTop: '14px', borderTop: '1px solid var(--okdesk-script-border-muted)' });
            const list = document.createElement('div');
            if (!rules.length) list.textContent = 'Правил пока нет.';
            rules.forEach((rule, index) => {
                const row = document.createElement('div');
                Object.assign(row.style, { display: 'flex', gap: '8px', alignItems: 'end', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid var(--okdesk-script-border-muted)' });
                const domain = document.createElement('input');
                domain.type = 'text'; domain.value = rule.domain; domain.placeholder = 'Домен, например poscenter.ru';
                Object.assign(domain.style, { flex: '1 1 220px', minWidth: '180px', padding: '7px', boxSizing: 'border-box' });
                const label = document.createElement('input');
                label.type = 'text'; label.value = rule.label; label.placeholder = 'Текст в теме, например от сотрудника';
                Object.assign(label.style, { flex: '1 1 220px', minWidth: '180px', padding: '7px', boxSizing: 'border-box' });
                domain.oninput = () => { rule.domain = domain.value; };
                label.oninput = () => { rule.label = label.value; };
                const up = document.createElement('button');
                up.type = 'button'; up.textContent = '↑'; up.title = 'Переместить выше'; up.disabled = index === 0;
                up.onclick = () => { [rules[index - 1], rules[index]] = [rules[index], rules[index - 1]]; render(); };
                const down = document.createElement('button');
                down.type = 'button'; down.textContent = '↓'; down.title = 'Переместить ниже'; down.disabled = index === rules.length - 1;
                down.onclick = () => { [rules[index], rules[index + 1]] = [rules[index + 1], rules[index]]; render(); };
                const remove = document.createElement('button');
                remove.type = 'button'; remove.textContent = 'Удалить';
                remove.onclick = () => { rules.splice(index, 1); render(); };
                row.append(domain, label, up, down, remove);
                list.appendChild(row);
            });
            const actions = document.createElement('div');
            Object.assign(actions.style, { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' });
            const add = document.createElement('button');
            add.type = 'button'; add.textContent = 'Добавить правило';
            add.onclick = () => { rules.push({ domain: '', label: '' }); render(); };
            const save = document.createElement('button');
            save.type = 'button'; save.textContent = 'Сохранить';
            save.onclick = () => {
                if (rules.some((rule) => !rule.domain.trim() || !rule.label.trim())) {
                    showToast('Заполните домен и текст для каждого правила.', true);
                    return;
                }
                saveEmailDomainLabels(rules);
                GM_setValue(TITLE_NORMALIZATION_ENABLED_KEY, settings.enabled);
                GM_setValue(TITLE_NORMALIZATION_ONLY_ASSIGNED_KEY, settings.onlyAssigned);
                GM_setValue(TITLE_NORMALIZATION_ONCE_KEY, settings.onlyOnce);
                GM_setValue(TITLE_NORMALIZATION_SKIP_PREFIX_KEY, settings.skipPrefix.trim());
                dialog.remove();
                showToast('Настройки изменения темы сохранены.');
            };
            const close = document.createElement('button');
            close.type = 'button'; close.textContent = 'Отмена'; close.onclick = () => dialog.remove();
            actions.append(add, save, close);
            box.append(title, note, enabled, onlyAssigned, onlyAssignedHint, onlyOnce, onlyOnceHint, skipPrefixLabel, sectionTitle, list, actions);
        };
        dialog.addEventListener('mousedown', (event) => { if (event.target === dialog) dialog.remove(); });
        render();
    }

    function getQuickReplies() {
        try {
            const saved = JSON.parse(GM_getValue(QUICK_REPLIES_KEY, '[]'));
            let replies = Array.isArray(saved)
                ? saved.filter((item) => item && item.title && item.text && item.statusCode)
                : [];
            if (GM_getValue(QUICK_REPLIES_VERSION_KEY, 0) < QUICK_REPLIES_VERSION) {
                const existingKeys = new Set(replies.map((item) => item.standardKey).filter(Boolean));
                const missingDefaults = DEFAULT_QUICK_REPLIES
                    .filter((item) => !existingKeys.has(item.standardKey))
                    .map((item) => ({ ...item }));
                replies = [...replies, ...missingDefaults];
                GM_setValue(QUICK_REPLIES_KEY, JSON.stringify(replies));
                GM_setValue(QUICK_REPLIES_VERSION_KEY, QUICK_REPLIES_VERSION);
            }
            return replies.map((item, index) => ({ ...item, public: item.public !== false, color: getQuickReplyColor(item, index) }));
        } catch (_) {
            return [];
        }
    }

    function saveQuickReplies(items) {
        GM_setValue(QUICK_REPLIES_KEY, JSON.stringify(items));
    }

    function getQuickReplyColor(reply, index = 0) {
        return /^#[0-9a-f]{6}$/i.test(reply?.color || '')
            ? reply.color
            : QUICK_REPLY_COLORS[index % QUICK_REPLY_COLORS.length];
    }

    function createQuickReply(index) {
        return {
            id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            title: 'Быстрый ответ',
            text: '',
            statusCode: 'MoreDetails',
            public: true,
            color: QUICK_REPLY_COLORS[index % QUICK_REPLY_COLORS.length],
        };
    }

    function animateReorderedRows(list, movedItem, swap, render) {
        const previousTops = new Map([...list.children]
            .filter((row) => row.okdeskReorderItem)
            .map((row) => [row.okdeskReorderItem, row.getBoundingClientRect().top]));
        swap();
        const nextList = render();
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
        [...nextList.children].forEach((row) => {
            const previousTop = previousTops.get(row.okdeskReorderItem);
            if (previousTop === undefined || !row.animate) return;
            const offset = previousTop - row.getBoundingClientRect().top;
            if (Math.abs(offset) < 1 && row.okdeskReorderItem !== movedItem) return;
            row.animate([
                { transform: `translateY(${offset}px)`, backgroundColor: row.okdeskReorderItem === movedItem ? 'var(--okdesk-script-highlight)' : 'var(--okdesk-script-raised)' },
                { transform: 'translateY(0)', backgroundColor: 'var(--okdesk-script-raised)' },
            ], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        });
    }

    function replaceTemplateEmoji(title, emoji) {
        let text = String(title || '').trimStart();
        for (const group of TEMPLATE_EMOJI_GROUPS) {
            const previous = group.items.find(([symbol]) => text.startsWith(symbol));
            if (previous) {
                text = text.slice(previous[0].length).trimStart();
                break;
            }
        }
        return emoji ? `${emoji}${text ? ` ${text}` : ''}` : text;
    }

    function closeTemplateEmojiPicker() {
        if (!templateEmojiPicker) return;
        const { panel, button, onOutside, onKeyDown } = templateEmojiPicker;
        document.removeEventListener('pointerdown', onOutside, true);
        document.removeEventListener('keydown', onKeyDown, true);
        button.setAttribute('aria-expanded', 'false');
        panel.remove();
        templateEmojiPicker = null;
    }

    function positionTemplateEmojiPicker(button, panel) {
        const anchor = button.getBoundingClientRect();
        const bounds = panel.getBoundingClientRect();
        const margin = 8;
        const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - bounds.width - margin));
        const below = anchor.bottom + 6;
        const top = below + bounds.height <= window.innerHeight - margin
            ? below
            : Math.max(margin, anchor.top - bounds.height - 6);
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }

    function createTemplateEmojiButton(titleInput) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '▦';
        button.title = 'Добавить или заменить значок в названии';
        button.setAttribute('aria-label', 'Выбрать значок для названия');
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', 'okdesk-template-emoji-picker');
        Object.assign(button.style, { position: 'absolute', right: '3px', bottom: '3px', width: '30px', height: '28px', boxSizing: 'border-box', padding: '0', border: '0', borderLeft: '1px solid var(--okdesk-script-border-input)', borderRadius: '0 3px 3px 0', background: 'transparent', color: 'var(--okdesk-script-text)', cursor: 'pointer', fontSize: '16px' });
        button.addEventListener('click', () => {
            if (templateEmojiPicker?.button === button) {
                closeTemplateEmojiPicker();
                return;
            }
            closeTemplateEmojiPicker();
            const panel = document.createElement('div');
            panel.id = 'okdesk-template-emoji-picker';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', 'Значки для названия');
            Object.assign(panel.style, { position: 'fixed', zIndex: '2', width: '310px', maxWidth: 'calc(100vw - 16px)', maxHeight: 'min(420px, calc(100vh - 16px))', overflowY: 'auto', boxSizing: 'border-box', padding: '6px', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '6px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)', boxShadow: '0 8px 24px rgba(0,0,0,.45)', textAlign: 'left' });
            const choose = (emoji) => {
                titleInput.value = replaceTemplateEmoji(titleInput.value, emoji);
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                closeTemplateEmojiPicker();
                titleInput.focus();
            };
            const makeChoice = (emoji, label) => {
                const choice = document.createElement('button');
                choice.type = 'button';
                choice.textContent = emoji ? `${emoji} ${label}` : '✕ Без значка';
                Object.assign(choice.style, { width: '100%', minHeight: '32px', padding: '5px 7px', border: '0', borderRadius: '4px', background: 'transparent', color: 'var(--okdesk-script-text)', textAlign: 'left', cursor: 'pointer' });
                choice.addEventListener('mouseenter', () => { choice.style.background = 'var(--okdesk-script-highlight)'; });
                choice.addEventListener('mouseleave', () => { choice.style.background = 'transparent'; });
                choice.addEventListener('click', () => choose(emoji));
                return choice;
            };
            panel.appendChild(makeChoice('', 'Без значка'));
            TEMPLATE_EMOJI_GROUPS.forEach((group) => {
                const category = document.createElement('details');
                Object.assign(category.style, { borderTop: '1px solid var(--okdesk-script-border-soft)' });
                const heading = document.createElement('summary');
                heading.textContent = group.label;
                Object.assign(heading.style, { padding: '9px 8px', textAlign: 'left', cursor: 'pointer', fontWeight: '600' });
                const choices = document.createElement('div');
                Object.assign(choices.style, { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '2px', padding: '0 4px 7px' });
                group.items.forEach(([emoji, label]) => choices.appendChild(makeChoice(emoji, label)));
                category.append(heading, choices);
                category.addEventListener('toggle', () => {
                    if (category.open) panel.querySelectorAll('details').forEach((other) => { if (other !== category) other.open = false; });
                    requestAnimationFrame(() => { if (panel.isConnected) positionTemplateEmojiPicker(button, panel); });
                });
                panel.appendChild(category);
            });
            const onOutside = (event) => {
                if (!panel.contains(event.target) && event.target !== button) closeTemplateEmojiPicker();
            };
            const onKeyDown = (event) => {
                if (event.key === 'Escape') {
                    closeTemplateEmojiPicker();
                    button.focus();
                    event.preventDefault();
                }
            };
            (titleInput.closest('[data-okdesk-script-ui]') || document.body).appendChild(panel);
            document.addEventListener('pointerdown', onOutside, true);
            document.addEventListener('keydown', onKeyDown, true);
            templateEmojiPicker = { panel, button, onOutside, onKeyDown };
            button.setAttribute('aria-expanded', 'true');
            positionTemplateEmojiPicker(button, panel);
        });
        return button;
    }

    function createTemplateTitleField(label, input) {
        const field = document.createElement('div');
        Object.assign(field.style, { position: 'relative', flex: '1 1 auto', minWidth: '0' });
        Object.assign(label.style, { display: 'block', width: '100%', minWidth: '0', boxSizing: 'border-box' });
        input.style.paddingRight = '40px';
        field.append(label, createTemplateEmojiButton(input));
        return field;
    }

    function getSavedIssueStatuses() {
        try {
            const raw = GM_getValue(ISSUE_STATUSES_KEY, null);
            if (raw === null) return DEFAULT_ISSUE_STATUSES.map((status) => ({ ...status }));
            const saved = JSON.parse(raw);
            const statuses = Array.isArray(saved)
                ? saved.filter((item) => item && typeof item.code === 'string' && item.code.trim() && typeof item.name === 'string')
                : [];
            return statuses;
        } catch (_) {
            return DEFAULT_ISSUE_STATUSES.map((status) => ({ ...status }));
        }
    }

    function saveIssueStatuses(statuses) {
        const uniqueCodes = new Set();
        const normalized = statuses
            .map((status) => ({
                code: String(status.code || '').trim(),
                name: String(status.name || '').trim(),
                color: String(status.color || ''),
            }))
            .filter((status) => status.code && status.name && !uniqueCodes.has(status.code) && uniqueCodes.add(status.code));
        GM_setValue(ISSUE_STATUSES_KEY, JSON.stringify(normalized));
    }

    async function loadIssueStatuses(save = true) {
        const response = await apiRequest('/issues/statuses');
        const statuses = (Array.isArray(response) ? response : response?.data || [])
            .filter((item) => item && item.code && item.name)
            .map((item) => ({ code: String(item.code), name: String(item.name), color: String(item.color || '') }))
            .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
        if (!statuses.length) throw new Error('API не вернул доступных статусов');
        if (save) saveIssueStatuses(statuses);
        return statuses;
    }

    function openQuickReplySettings(activeTab = GM_getValue(TEMPLATE_SETTINGS_TAB_KEY, 'quick')) {
        if (activeTab !== 'quick' && activeTab !== 'insert') activeTab = 'quick';
        GM_setValue(TEMPLATE_SETTINGS_TAB_KEY, activeTab);
        const dialog = document.createElement('div');
        dialog.dataset.okdeskScriptUi = 'true';
        Object.assign(dialog.style, {
            position: 'fixed', zIndex: '2147483648', inset: '0', overflow: 'auto', background: 'rgba(0,0,0,.6)',
            font: '14px Arial,sans-serif',
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            width: '760px', maxWidth: 'calc(100% - 32px)', margin: '32px auto', padding: '18px',
            borderRadius: '8px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)',
        });
        dialog.appendChild(box);
        document.body.appendChild(dialog);
        const replies = getQuickReplies();
        const templates = getTemplates();
        const insertionEditorState = { search: '', expanded: new WeakSet() };
        const statusOptions = getSavedIssueStatuses();
        const tabs = document.createElement('div');
        Object.assign(tabs.style, { display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--okdesk-script-border-soft)', paddingBottom: '10px' });
        const content = document.createElement('div');
        const actions = document.createElement('div');
        Object.assign(actions.style, { display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' });
        const save = document.createElement('button');
        save.type = 'button'; save.textContent = 'Сохранить';
        save.onclick = () => {
            const incomplete = replies.find((item) => !item.title.trim() || !item.text.trim() || !item.statusCode.trim());
            if (incomplete || !areTemplateTitlesFilled(templates)) {
                showToast('Заполните названия и тексты шаблонов, а также коды статусов быстрых ответов.', true);
                return;
            }
            replies.forEach((item) => {
                item.title = item.title.trim();
                item.text = item.text.trim();
                item.statusCode = item.statusCode.trim();
            });
            saveQuickReplies(replies);
            saveTemplates(templates);
            closeTemplateEmojiPicker();
            dialog.remove();
            document.getElementById('okdesk-quick-replies-panel')?.remove();
            addQuickReplyPanel();
            showToast('Шаблоны сохранены.');
        };
        const close = document.createElement('button');
        close.type = 'button'; close.textContent = 'Отмена'; close.onclick = () => { closeTemplateEmojiPicker(); dialog.remove(); };
        actions.append(save, close);
        box.append(tabs, content, actions);

        const renderTabs = () => {
            tabs.replaceChildren();
            [['quick', 'Шаблоны быстрых ответов'], ['insert', 'Шаблоны для вставки']].forEach(([id, label]) => {
                const button = document.createElement('button');
                button.type = 'button'; button.textContent = label;
                button.setAttribute('aria-pressed', String(activeTab === id));
                Object.assign(button.style, { padding: '8px 12px', border: activeTab === id ? '1px solid #62b5a2' : '1px solid var(--okdesk-script-border-soft)', borderRadius: '4px', background: activeTab === id ? 'var(--okdesk-script-selected)' : 'transparent', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
                button.onclick = () => {
                    activeTab = id;
                    GM_setValue(TEMPLATE_SETTINGS_TAB_KEY, id);
                    renderTabs();
                    render();
                };
                tabs.appendChild(button);
            });
        };

        const render = () => {
            closeTemplateEmojiPicker();
            content.replaceChildren();
            if (activeTab === 'insert') {
                renderInsertionTemplateSettings(content, templates, insertionEditorState, (item, items, index) => {
                    replies.push({
                        ...createQuickReply(replies.length),
                        title: item.title,
                        text: item.text || '',
                        statusCode: '',
                        public: false,
                    });
                    items.splice(index, 1);
                    activeTab = 'quick';
                    GM_setValue(TEMPLATE_SETTINGS_TAB_KEY, activeTab);
                    renderTabs();
                    render();
                    const statusInputs = content.querySelectorAll('[data-field="status"]');
                    const newStatusInput = statusInputs[statusInputs.length - 1];
                    newStatusInput?.scrollIntoView({ block: 'center' });
                    newStatusInput?.focus();
                    showToast('Шаблон перенесён. Выберите статус и сохраните изменения.');
                });
                return;
            }
            const title = document.createElement('h3');
            title.textContent = 'Быстрые ответы в шапке заявки';
            title.style.marginTop = '0';
            const note = document.createElement('p');
            note.textContent = 'Кнопка отправляет комментарий через API, затем меняет статус заявки. Список статусов настраивается в разделе «Передача заявок». Порядок в списке соответствует панели.';
            note.style.color = 'var(--okdesk-script-muted-soft)';
            content.append(title, note);

            const list = document.createElement('div');
            replies.forEach((reply, index) => {
                const row = document.createElement('div');
                row.okdeskReorderItem = reply;
                Object.assign(row.style, { marginTop: '10px', padding: '12px', border: '1px solid var(--okdesk-script-border-soft)', borderRadius: '6px', background: 'var(--okdesk-script-raised)' });
                row.innerHTML = `
                    <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
                        <label>Название кнопки<br><input data-field="title" style="width:100%;box-sizing:border-box;margin-top:4px;padding:7px"></label>
                        <label style="flex:1 1 160px;min-width:150px">Код статуса<br><input data-field="status" list="okdesk-quick-statuses" style="width:100%;box-sizing:border-box;margin-top:4px;padding:7px"></label>
                        <label style="width:74px">Цвет<br><input type="color" data-field="color" style="width:100%;height:33px;margin-top:4px;padding:2px"></label>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px">
                        <label style="white-space:nowrap"><input type="checkbox" data-field="public"> Открытый комментарий</label>
                        <span style="flex:1 1 auto"></span>
                        <button type="button" data-action="up" title="Выше">↑</button>
                        <button type="button" data-action="down" title="Ниже">↓</button>
                        <button type="button" data-action="remove">Удалить</button>
                    </div>
                    <label style="display:block;margin-top:10px">Текст комментария<br><textarea data-field="text" rows="5" style="width:100%;box-sizing:border-box;margin-top:4px;padding:7px;resize:vertical"></textarea></label>`;
                const titleInput = row.querySelector('[data-field="title"]');
                const statusInput = row.querySelector('[data-field="status"]');
                const textInput = row.querySelector('[data-field="text"]');
                const publicInput = row.querySelector('[data-field="public"]');
                const colorInput = row.querySelector('[data-field="color"]');
                titleInput.value = reply.title;
                const titleLabel = titleInput.closest('label');
                const titleField = createTemplateTitleField(titleLabel, titleInput);
                titleField.style.flex = '2 1 260px';
                titleField.style.minWidth = '180px';
                row.querySelector('div').prepend(titleField);
                statusInput.value = reply.statusCode;
                textInput.value = reply.text;
                publicInput.checked = reply.public !== false;
                colorInput.value = getQuickReplyColor(reply, index);
                [titleInput, statusInput, textInput].forEach((input) => input.addEventListener('input', () => {
                    reply.title = titleInput.value;
                    reply.statusCode = statusInput.value;
                    reply.text = textInput.value;
                }));
                publicInput.addEventListener('change', () => { reply.public = publicInput.checked; });
                colorInput.addEventListener('input', () => { reply.color = colorInput.value; });
                row.querySelector('[data-action="up"]').onclick = () => {
                    if (!index) return;
                    animateReorderedRows(list, reply, () => {
                        [replies[index - 1], replies[index]] = [replies[index], replies[index - 1]];
                    }, render);
                };
                row.querySelector('[data-action="down"]').onclick = () => {
                    if (index === replies.length - 1) return;
                    animateReorderedRows(list, reply, () => {
                        [replies[index], replies[index + 1]] = [replies[index + 1], replies[index]];
                    }, render);
                };
                row.querySelector('[data-action="remove"]').onclick = () => {
                    replies.splice(index, 1);
                    render();
                };
                list.appendChild(row);
            });
            const datalist = document.createElement('datalist');
            datalist.id = 'okdesk-quick-statuses';
            statusOptions.forEach((status) => {
                const option = document.createElement('option');
                option.value = status.code;
                option.label = status.name;
                datalist.appendChild(option);
            });
            const add = document.createElement('button');
            add.type = 'button'; add.textContent = '+ Добавить кнопку';
            add.onclick = () => { replies.push(createQuickReply(replies.length)); render(); };
            add.style.marginTop = '14px';
            content.append(list, datalist, add);
            return list;
        };
        dialog.addEventListener('mousedown', (event) => { if (event.target === dialog) { closeTemplateEmojiPicker(); dialog.remove(); } });
        renderTabs();
        render();
    }

    function addQuickReplyPanel() {
        const issueId = getIssueId();
        const currentPanel = document.getElementById('okdesk-quick-replies-panel');
        const panelPosition = getQuickReplyPanelPosition();
        if (!issueId) {
            currentPanel?.remove();
            return;
        }
        if (currentPanel?.dataset.issueId === issueId && currentPanel.dataset.position === panelPosition) {
            if (currentPanel.dataset.fallback !== 'true' || !findCommentTabsAnchor()) return;
        }
        currentPanel?.remove();

        const numberAnchor = findIssueHeaderAnchor(issueId);
        const topicAnchor = findIssueTopicAnchor(issueId);
        const anchor = topicAnchor || numberAnchor;
        if (!anchor) return;
        const panel = document.createElement('div');
        panel.id = 'okdesk-quick-replies-panel';
        panel.dataset.issueId = issueId;
        panel.dataset.position = panelPosition;
        Object.assign(panel.style, {
            display: 'flex', width: 'calc(100% - 16px)', minHeight: '41px', flex: '0 0 calc(100% - 16px)', gridColumn: '1 / -1', justifySelf: 'stretch', boxSizing: 'border-box', alignItems: 'center', flexWrap: 'wrap', gap: '6px', margin: '0 8px 10px', padding: '1px 10px 2px',
            border: '1px solid var(--okdesk-script-border-panel)', borderRadius: '6px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)',
        });
        const settings = document.createElement('button');
        settings.type = 'button'; settings.textContent = '⚙'; settings.title = 'Настроить шаблоны';
        Object.assign(settings.style, { width: '30px', height: '30px', boxSizing: 'border-box', marginLeft: 'auto', padding: '0', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '4px', background: 'transparent', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
        settings.onclick = () => openQuickReplySettings();

        const buttons = document.createElement('div');
        Object.assign(buttons.style, { display: 'flex', flex: '1 1 auto', minWidth: '0', alignItems: 'center', flexWrap: 'wrap', gap: '6px' });
        const replies = getQuickReplies();
        replies.forEach((reply, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = reply.title;
            button.title = `Отправить комментарий и установить статус: ${getStatusLabel(reply.statusCode)}`;
            const color = getQuickReplyColor(reply, index);
            Object.assign(button.style, {
                height: '30px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', padding: '0 10px', whiteSpace: 'nowrap',
                border: `1px solid ${color}`, borderLeft: `4px solid ${color}`, borderRadius: '4px', background: `${color}24`,
                color: 'var(--okdesk-script-text)', cursor: 'pointer', fontSize: '12px',
            });
            button.addEventListener('click', () => runQuickReply(reply, panel));
            buttons.appendChild(button);
        });
        panel.appendChild(buttons);
        panel.appendChild(settings);
        if (panelPosition === 'fixed-top') {
            mountFloatingQuickReplyPanel(panel, anchor);
            return;
        }
        const commentTabsAnchor = findCommentTabsAnchor();
        if (panelPosition === 'after-description' && commentTabsAnchor) {
            const commentTabsHost = findCommentTabsHost(commentTabsAnchor);
            (commentTabsHost || commentTabsAnchor).insertAdjacentElement('beforebegin', panel);
            return;
        }
        if (panelPosition === 'after-comments' && commentTabsAnchor) {
            const commentTabsHost = findCommentTabsHost(commentTabsAnchor);
            panel.style.margin = '14px 8px 10px';
            (commentTabsHost || commentTabsAnchor).insertAdjacentElement('afterend', panel);
            return;
        }

        if (panelPosition === 'after-description' || panelPosition === 'after-comments') {
            // The comment tabs are rendered asynchronously by Okdesk. Mark this
            // temporary header placement so the next DOM update relocates it.
            panel.dataset.fallback = 'true';
        }

        const headerHost = findIssueHeaderHost(numberAnchor, topicAnchor);
        if (headerHost) headerHost.prepend(panel);
        else anchor.insertAdjacentElement('beforebegin', panel);
    }

    function getQuickReplyPanelPosition() {
        const value = GM_getValue(QUICK_REPLY_PANEL_POSITION_KEY, DEFAULT_QUICK_REPLY_PANEL_POSITION);
        return ['header', 'after-description', 'after-comments', 'fixed-top'].includes(value)
            ? value
            : DEFAULT_QUICK_REPLY_PANEL_POSITION;
    }

    function mountFloatingQuickReplyPanel(panel, anchor) {
        panel.dataset.floating = 'true';
        Object.assign(panel.style, {
            position: 'fixed', zIndex: '2147483640', margin: '0',
            boxShadow: '0 8px 22px rgba(0,0,0,.38)',
        });
        document.body.appendChild(panel);
        positionFloatingQuickReplyPanel(panel, anchor);
        if (floatingQuickReplyPanelListenerInstalled) return;
        floatingQuickReplyPanelListenerInstalled = true;
        const reposition = () => {
            const current = document.getElementById('okdesk-quick-replies-panel');
            if (current?.dataset.floating !== 'true') return;
            const issueId = getIssueId();
            const issueAnchor = issueId ? (findIssueTopicAnchor(issueId) || findIssueHeaderAnchor(issueId)) : null;
            if (issueAnchor) positionFloatingQuickReplyPanel(current, issueAnchor);
        };
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
    }

    function positionFloatingQuickReplyPanel(panel, anchor) {
        const header = findTopNavigationHost();
        const content = findIssueContentHost(anchor);
        const headerRect = header?.getBoundingClientRect();
        const contentRect = content?.getBoundingClientRect() || anchor.getBoundingClientRect();
        const margin = 8;
        const contentInset = 8;
        const top = Math.max(margin, (headerRect?.bottom || 0) + 6);
        const left = Math.max(margin, contentRect.left + contentInset);
        const right = Math.min(window.innerWidth - margin, contentRect.right - contentInset);
        const width = Math.max(280, right - left);
        panel.style.top = `${top}px`;
        panel.style.left = `${left}px`;
        panel.style.width = `${width}px`;
        panel.style.maxWidth = `calc(100vw - ${left + margin}px)`;
    }

    function findTopNavigationHost() {
        const newIssueButton = [...document.querySelectorAll('button, a')]
            .find((element) => isVisible(element) && /Новая заявка/i.test((element.innerText || '').trim()));
        if (!newIssueButton) return null;
        for (let element = newIssueButton.parentElement; element && element !== document.body; element = element.parentElement) {
            const rect = element.getBoundingClientRect();
            if (isVisible(element) && rect.top <= 8 && rect.height >= 36 && rect.height <= 120 && rect.width >= 500) return element;
        }
        return newIssueButton;
    }

    function findIssueContentHost(anchor) {
        for (let element = anchor.parentElement; element && element !== document.body; element = element.parentElement) {
            const rect = element.getBoundingClientRect();
            if (!isVisible(element) || rect.width < 600 || rect.height < 180) continue;
            if (rect.left >= 0 && rect.right <= window.innerWidth + 1) return element;
        }
        return anchor;
    }

    function findCommentTabsAnchor() {
        const pattern = /^Комментарии\s*(?:\(\d+\))?$/i;
        return [...document.querySelectorAll('button, a, [role="tab"], h1, h2, h3, div, span')]
            .filter((element) => isVisible(element) && pattern.test((element.innerText || '').trim()))
            .sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)[0] || null;
    }

    function findCommentTabsHost(anchor) {
        for (let element = anchor.parentElement; element && element !== document.body; element = element.parentElement) {
            const text = (element.innerText || '').trim();
            const rect = element.getBoundingClientRect();
            if (!isVisible(element) || rect.width < 400 || rect.height > 150) continue;
            if (/^Комментарии\s*(?:\(\d+\))?/i.test(text) && /Вложенн(?:ые|ых) заявк/i.test(text)) return element;
        }
        return null;
    }

    function findIssueHeaderHost(numberAnchor, topicAnchor) {
        if (!numberAnchor || !topicAnchor) return null;
        const numberRect = numberAnchor.getBoundingClientRect();
        const topicRect = topicAnchor.getBoundingClientRect();
        // A blank or incomplete Okdesk header can put the subject far above the
        // issue number. Those elements do not share a reliable layout container.
        if (Math.abs(numberRect.top - topicRect.top) > 64) return null;
        const numberAncestors = new Set();
        for (let element = numberAnchor.parentElement; element && element !== document.body; element = element.parentElement) {
            numberAncestors.add(element);
        }
        for (let element = topicAnchor.parentElement; element && element !== document.body; element = element.parentElement) {
            if (!numberAncestors.has(element) || !isVisible(element)) continue;
            const rect = element.getBoundingClientRect();
            if (rect.width >= 600 && rect.height >= 80) return element;
        }
        return null;
    }

    function findIssueTopicAnchor(issueId) {
        const numberAnchor = findIssueHeaderAnchor(issueId);
        if (!numberAnchor) return null;
        const numberRect = numberAnchor.getBoundingClientRect();
        const numberPattern = new RegExp(`(^|\\s)0*${issueId}(?=\\D|$)`);
        const titleSelectors = 'h1, h2, h3, [role="heading"], [class*="issue-title"], [class*="issue-subject"], [class*="issue-name"], [class*="subject"], [class*="title"]';
        const candidates = [...document.querySelectorAll(titleSelectors)]
            .map((element) => ({ element, text: (element.innerText || '').trim(), rect: element.getBoundingClientRect() }))
            .filter(({ element, text, rect }) => isVisible(element)
                // Short subjects such as "Z1 Драйвера" are valid issue topics too.
                && text.length > 0
                && text.length <= 500
                && !numberPattern.test(text)
                && !/^Заявк[аи]?\s*№?/i.test(text)
                && rect.left > numberRect.left + 20
                && rect.left < window.innerWidth * 0.82
                && rect.top <= numberRect.top + 20)
            .sort((left, right) => {
                const leftDistance = Math.abs(numberRect.top - left.rect.top);
                const rightDistance = Math.abs(numberRect.top - right.rect.top);
                return leftDistance - rightDistance || right.rect.width - left.rect.width;
            });
        return candidates[0]?.element || null;
    }

    function findIssueHeaderAnchor(issueId) {
        const numberPattern = new RegExp(`(^|\\s)0*${issueId}(?=\\D|$)`);
        const candidates = [...document.querySelectorAll('h1, h2, h3, [role="heading"], [class*="issue-title"], [class*="issue-header"]')]
            .filter((element) => isVisible(element) && numberPattern.test(element.textContent || ''))
            .sort((left, right) => (left.textContent || '').length - (right.textContent || '').length);
        if (candidates[0]) return candidates[0];

        // In some Okdesk layouts the issue number is plain text rather than a heading.
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const text = node.nodeValue?.trim() || '';
            if (!numberPattern.test(text)) continue;
            let element = node.parentElement;
            while (element && element !== document.body) {
                const content = (element.innerText || '').trim();
                if (isVisible(element) && content.length > 0 && content.length < 280) return element;
                element = element.parentElement;
            }
        }
        return null;
    }

    function getStatusLabel(code) {
        return getSavedIssueStatuses().find((status) => status.code === code)?.name
            || ({ MoreDetails: 'Ожидание ответа', completed: 'Решена', closed: 'Закрыта' })[code]
            || code;
    }

    async function isIssueAlreadyInStatus(issueId, statusCode) {
        try {
            const issue = await apiRequest(`/issues/${issueId}`);
            const currentCode = issue?.status?.code || issue?.status_code || '';
            return String(currentCode).toLowerCase() === String(statusCode).toLowerCase();
        } catch (error) {
            console.warn('Okdesk quick reply: cannot read current status', error);
            return false;
        }
    }

    function confirmPublicQuickReply(reply, descriptionText) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.dataset.okdeskQuickReplyConfirmation = 'true';
            Object.assign(overlay.style, {
                position: 'fixed', inset: '0', zIndex: '2147483649', display: 'grid', placeItems: 'center',
                padding: '16px', background: 'rgba(0, 0, 0, .58)', font: '14px Arial, sans-serif',
            });
            const dialog = document.createElement('div');
            Object.assign(dialog.style, {
                width: '390px', maxWidth: '100%', padding: '18px', boxSizing: 'border-box', border: '1px solid var(--okdesk-script-border)',
                borderRadius: '8px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)', boxShadow: '0 14px 40px rgba(0,0,0,.48)',
            });
            const title = document.createElement('div');
            title.textContent = 'Отправить открытый комментарий?';
            Object.assign(title.style, { fontSize: '16px', fontWeight: '600' });
            const description = document.createElement('p');
            description.textContent = descriptionText || `Клиент увидит комментарий из кнопки «${reply.title}». Статус заявки изменится на «${getStatusLabel(reply.statusCode)}».`;
            Object.assign(description.style, { margin: '10px 0 0', color: 'var(--okdesk-script-muted-soft)', lineHeight: '1.45' });
            const actions = document.createElement('div');
            Object.assign(actions.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' });
            const cancel = document.createElement('button');
            cancel.type = 'button'; cancel.textContent = 'Отмена';
            Object.assign(cancel.style, { height: '34px', padding: '0 12px', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '4px', background: 'var(--okdesk-script-raised)', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
            const confirm = document.createElement('button');
            confirm.type = 'button'; confirm.textContent = 'Отправить';
            Object.assign(confirm.style, { height: '34px', padding: '0 12px', border: '1px solid #438d71', borderRadius: '4px', background: 'var(--okdesk-script-primary)', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
            const finish = (confirmed) => {
                overlay.remove();
                document.removeEventListener('keydown', onKeydown, true);
                resolve(confirmed);
            };
            const onKeydown = (event) => {
                if (event.key === 'Escape') finish(false);
            };
            cancel.addEventListener('click', () => finish(false));
            confirm.addEventListener('click', () => finish(true));
            overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) finish(false); });
            actions.append(cancel, confirm);
            dialog.append(title, description, actions);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            document.addEventListener('keydown', onKeydown, true);
            cancel.focus();
        });
    }

    async function runQuickReply(reply, panel, issueId = getIssueId()) {
        if (quickReplyInFlight) return;
        if (!issueId) return;
        if (reply.public !== false && !await confirmPublicQuickReply(reply)) return;
        quickReplyInFlight = true;
        panel.querySelectorAll('button').forEach((button) => { button.disabled = true; });
        let commentSent = false;
        try {
            const content = formatQuickReplyContent(reply.text);
            const authorId = await getPrivateCommentAuthorId(getTransferSettings());
            showToast(`Отправляю: ${reply.title}.`);
            await apiRequest(`/issues/${issueId}/comments`, {
                method: 'POST',
                body: {
                    comment: {
                        content,
                        public: reply.public !== false,
                        author_id: authorId,
                        author_type: 'employee',
                    },
                },
            });
            commentSent = true;
            const token = GM_getValue(API_TOKEN_KEY, '');
            const statusAlreadySet = await isIssueAlreadyInStatus(issueId, reply.statusCode);
            if (!statusAlreadySet) {
                await changeStatus(issueId, token, reply.statusCode);
            }
            showToast(statusAlreadySet
                ? 'Комментарий отправлен.'
                : `Комментарий отправлен, статус: ${getStatusLabel(reply.statusCode)}.`);
            if (GM_getValue(RELOAD_AFTER_UPDATE_KEY, true)) {
                window.setTimeout(() => location.reload(), 700);
            }
            return true;
        } catch (error) {
            console.error('Okdesk quick reply:', error);
            showToast(commentSent ? 'Комментарий отправлен, но статус изменить не удалось.' : `Не удалось отправить быстрый ответ: ${error.message}`, true);
            panel.querySelectorAll('button').forEach((button) => { button.disabled = false; });
        } finally {
            quickReplyInFlight = false;
        }
    }

    function getTemplates() {
        const saved = GM_getValue(TEMPLATES_KEY, null);
        if (!saved) {
            const defaults = structuredClone(DEFAULT_TEMPLATES);
            saveTemplates(defaults);
            return defaults;
        }
        try {
            const templates = JSON.parse(saved);
            if (isPreviousDefaultTemplates(templates)) {
                const updated = structuredClone(DEFAULT_TEMPLATES);
                saveTemplates(updated);
                return updated;
            }
            const needsUpdate = GM_getValue(TEMPLATES_VERSION_KEY, 0) < TEMPLATES_VERSION;
            if (needsUpdate) {
                addMissingStandardTemplates(templates);
            }
            if (needsUpdate || ensureTemplateIds(templates)) {
                saveTemplates(templates);
            }
            return templates;
        } catch (_) {
            return structuredClone(DEFAULT_TEMPLATES);
        }
    }

    function isPreviousDefaultTemplates(templates) {
        const previousTitles = ['👋 Решена', '⏳ Инфа', 'ЗИП', 'Некорректно составлена заявка'];
        return Array.isArray(templates)
            && templates.length === previousTitles.length
            && templates.every((item, index) => item.title === previousTitles[index]);
    }

    function saveTemplates(items) {
        ensureTemplateIds(items);
        GM_setValue(TEMPLATES_KEY, JSON.stringify(items));
        GM_setValue(TEMPLATES_VERSION_KEY, TEMPLATES_VERSION);
    }

    function exportTemplateBundle() {
        const data = { format: 'okdesk-comment-templates', version: 1, templates: getTemplates(), quickReplies: getQuickReplies() };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `okdesk-templates-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function importTemplateBundle(result) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            result.hidden = false;
            result.textContent = 'Импорт шаблонов...';
            try {
                if (file.size > 5 * 1024 * 1024) throw new Error('файл больше 5 МБ');
                const data = JSON.parse(await file.text());
                if (data?.format !== 'okdesk-comment-templates' || data.version !== 1 || !Array.isArray(data.templates)) {
                    throw new Error('неподдерживаемый формат файла');
                }
                const imported = sanitizeImportedTemplateTree(data.templates);
                const quickReplies = data.quickReplies === undefined ? [] : sanitizeImportedQuickReplies(data.quickReplies);
                const templates = getTemplates();
                const knownIds = new Set();
                const collectIds = (items) => items.forEach((item) => {
                    if (Array.isArray(item.children)) collectIds(item.children);
                    else if (item.id) knownIds.add(item.id);
                });
                collectIds(templates);
                const counts = { added: 0, foldersAdded: 0, skipped: 0 };
                mergeImportedTemplateTree(templates, imported, knownIds, counts);
                if (counts.added || counts.foldersAdded) saveTemplates(templates);
                const existingReplies = getQuickReplies();
                let addedReplies = 0;
                let skippedReplies = 0;
                quickReplies.forEach((reply) => {
                    if (existingReplies.some((item) => (reply.id && item.id === reply.id)
                        || (reply.standardKey && item.standardKey === reply.standardKey)
                        || item.title === reply.title)) {
                        skippedReplies++;
                        return;
                    }
                    existingReplies.push(reply);
                    addedReplies++;
                });
                if (addedReplies) {
                    saveQuickReplies(existingReplies);
                    document.getElementById('okdesk-quick-replies-panel')?.remove();
                    addQuickReplyPanel();
                }
                result.textContent = `Импорт завершён. Добавлено: шаблонов ${counts.added}, папок ${counts.foldersAdded}, быстрых ответов ${addedReplies}. Уже были: шаблонов ${counts.skipped}, быстрых ответов ${skippedReplies}.`;
                result.style.borderColor = '#4d9b87';
                result.style.background = 'var(--okdesk-script-success-bg)';
            } catch (error) {
                result.textContent = `Не удалось импортировать шаблоны: ${error.message}`;
                result.style.borderColor = '#b3261e';
                result.style.background = 'var(--okdesk-script-raised)';
            }
        });
        input.click();
    }

    function sanitizeImportedTemplateTree(items) {
        let count = 0;
        const visit = (nodes, depth) => {
            if (!Array.isArray(nodes) || depth > 10) throw new Error('неверная структура папок');
            return nodes.map((item) => {
                if (++count > 5000 || !item || typeof item !== 'object' || Array.isArray(item)
                    || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300) {
                    throw new Error('неверный шаблон в файле');
                }
                const title = item.title.trim();
                if (Array.isArray(item.children)) return { title, children: visit(item.children, depth + 1) };
                if (typeof item.text !== 'string' || item.text.length > 100000) throw new Error('неверный текст шаблона');
                return { title, text: item.text, ...(typeof item.id === 'string' && item.id.length <= 100 ? { id: item.id } : {}), pinned: item.pinned === true };
            });
        };
        return visit(items, 0);
    }

    function mergeImportedTemplateTree(target, source, knownIds, counts) {
        source.forEach((item) => {
            if (Array.isArray(item.children)) {
                let folder = target.find((existing) => Array.isArray(existing.children) && existing.title.trim() === item.title);
                if (!folder) {
                    folder = { title: item.title, children: [] };
                    target.push(folder);
                    counts.foldersAdded++;
                }
                mergeImportedTemplateTree(folder.children, item.children, knownIds, counts);
                return;
            }
            if ((item.id && knownIds.has(item.id)) || target.some((existing) => !Array.isArray(existing.children) && existing.title.trim() === item.title)) {
                counts.skipped++;
                return;
            }
            target.push(item);
            if (item.id) knownIds.add(item.id);
            counts.added++;
        });
    }

    function sanitizeImportedQuickReplies(items) {
        if (!Array.isArray(items) || items.length > 1000) throw new Error('неверный список быстрых ответов');
        return items.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)
                || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300
                || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 100000
                || typeof item.statusCode !== 'string' || !item.statusCode.trim() || item.statusCode.length > 100) {
                throw new Error('неверный быстрый ответ в файле');
            }
            return {
                title: item.title.trim(), text: item.text, statusCode: item.statusCode.trim(), public: item.public !== false,
                color: getQuickReplyColor(item),
                ...(typeof item.id === 'string' && item.id.length <= 100 ? { id: item.id } : {}),
                ...(typeof item.standardKey === 'string' && item.standardKey.length <= 100 ? { standardKey: item.standardKey } : {}),
            };
        });
    }

    function ensureTemplateIds(items) {
        const seen = new Set();
        let changed = false;
        const visit = (nodes) => nodes.forEach((item) => {
            if (Array.isArray(item.children)) {
                visit(item.children);
                return;
            }
            if (typeof item.id !== 'string' || !item.id || seen.has(item.id)) {
                item.id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
                changed = true;
            }
            seen.add(item.id);
        });
        if (Array.isArray(items)) visit(items);
        return changed;
    }

    function getTemplateUsage() {
        try {
            const usage = JSON.parse(GM_getValue(TEMPLATE_USAGE_KEY, '{}'));
            return usage && typeof usage === 'object' && !Array.isArray(usage) ? usage : {};
        } catch (_) {
            return {};
        }
    }

    function recordTemplateUse(item) {
        if (!item.id) return;
        const usage = getTemplateUsage();
        usage[item.id] = { count: Math.min((Number(usage[item.id]?.count) || 0) + 1, 1000), lastUsed: Date.now() };
        const recent = Object.entries(usage)
            .sort((left, right) => (right[1]?.lastUsed || 0) - (left[1]?.lastUsed || 0))
            .slice(0, 500);
        GM_setValue(TEMPLATE_USAGE_KEY, JSON.stringify(Object.fromEntries(recent)));
    }

    function sortDisplayedTemplates(items) {
        return items.map((item, index) => ({ item, index }))
            .sort((left, right) => Number(right.item.pinned === true) - Number(left.item.pinned === true) || left.index - right.index)
            .map(({ item }) => item);
    }

    function templateSearchScore(item, needle, usage) {
        const title = String(item.title || '').toLocaleLowerCase('ru');
        const body = String(item.text || '').toLocaleLowerCase('ru');
        const base = title === needle ? 100 : title.startsWith(needle) ? 80 : title.includes(needle) ? 60 : body.includes(needle) ? 20 : -Infinity;
        if (base === -Infinity) return base;
        return base + (item.pinned === true ? 5 : 0) + Math.min(Number(usage[item.id]?.count) || 0, 10) / 2;
    }

    function getTransferSettings() {
        const saved = GM_getValue(TRANSFER_SETTINGS_KEY, null);
        if (!saved) {
            return structuredClone(DEFAULT_TRANSFER_SETTINGS);
        }
        try {
            const parsed = JSON.parse(saved) || {};
            return {
                ...DEFAULT_TRANSFER_SETTINGS,
                ...parsed,
                authorMode: parsed.authorMode === 'manual' ? 'manual' : 'auto',
                employees: Array.isArray(parsed.employees) ? parsed.employees : [],
            };
        } catch (_) {
            return structuredClone(DEFAULT_TRANSFER_SETTINGS);
        }
    }

    function saveTransferSettings(settings) {
        GM_setValue(TRANSFER_SETTINGS_KEY, JSON.stringify(settings));
        transferEmployeesCache = null;
    }

    async function getTokenOwnerEmployeeId() {
        const token = GM_getValue(API_TOKEN_KEY, '');
        if (!token) {
            throw new Error('укажите API-токен Okdesk в настройках скрипта');
        }
        if (tokenOwnerCache?.token === token) {
            return tokenOwnerCache.employeeId;
        }
        // Okdesk returns the key owner's user_id in this response. The temporary login link is one-time,
        // valid for one minute, and is intentionally discarded without being opened or stored.
        const response = await apiRequest('/login_link', {
            method: 'POST',
            body: { expire_after: 1, one_time: true },
        });
        const employeeId = Number(response?.user_id);
        if (!Number.isInteger(employeeId) || employeeId <= 0 || response?.user_type !== 'employee') {
            throw new Error('API-токен не связан с активным сотрудником Okdesk');
        }
        tokenOwnerCache = { token, employeeId };
        return employeeId;
    }

    async function getPrivateCommentAuthorId(settings) {
        if (settings.authorMode === 'manual') {
            if (!settings.authorId) {
                throw new Error('в ручном режиме укажите ID автора скрытых комментариев');
            }
            return settings.authorId;
        }
        return getTokenOwnerEmployeeId();
    }

    function employeeDisplayName(employee) {
        return String(employee.name || [employee.last_name, employee.first_name, employee.patronymic]
            .filter(Boolean)
            .join(' ')).trim();
    }

    function normalizeEmployees(employees) {
        return employees
            .map((employee) => ({ id: Number(employee.id), name: employeeDisplayName(employee) }))
            .filter((employee) => Number.isInteger(employee.id) && employee.id > 0 && employee.name)
            .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    }

    function openTransferSettings() {
        const dialog = document.createElement('div');
        const settings = getTransferSettings();
        const employees = [...settings.employees];
        const statuses = getSavedIssueStatuses().map((status) => ({ ...status }));
        Object.assign(dialog.style, { position: 'fixed', inset: '0', zIndex: '2147483647', overflow: 'auto', background: 'rgba(0,0,0,.55)', font: '14px Arial,sans-serif' });
        const box = document.createElement('div');
        Object.assign(box.style, { width: '620px', maxWidth: 'calc(100% - 32px)', margin: '40px auto', padding: '18px', borderRadius: '8px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)' });
        box.innerHTML = `
            <h3 style="margin-top:0">Передача заявок</h3>
            <label style="display:block;margin-bottom:8px"><input data-field="manual-author" type="checkbox"> Использовать ID автора скрытых комментариев вручную</label>
            <label>ID автора скрытых комментариев<br><input data-field="author" type="number" min="1" placeholder="Определяется из текущей сессии Okdesk"></label>
            <div data-role="author-mode-hint" style="margin-top:6px;color:var(--okdesk-script-muted);font-size:12px"></div>
            <label style="display:block;margin-top:12px">ID группы сотрудников<br><input data-field="group" type="number" min="1"></label>
            <div style="display:flex;gap:8px;margin-top:16px">
                <button data-action="load">Загрузить сотрудников группы</button>
                <button data-action="groups">Найти группу</button>
                <button data-action="add">Добавить сотрудника</button>
            </div>
            <div data-role="employees" style="margin-top:14px"></div>
            <div style="margin-top:22px;padding-top:16px;border-top:1px solid var(--okdesk-script-border-muted)">
                <h4 style="margin:0">Статусы для отправки</h4>
                <div style="display:flex;gap:8px;margin-top:10px">
                    <button data-action="load-statuses">Загрузить статусы</button>
                    <button data-action="add-status">Добавить статус</button>
                </div>
                <div data-role="statuses" style="margin-top:12px"></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:18px">
                <button data-action="save">Сохранить</button>
                <button data-action="close">Отмена</button>
            </div>
        `;
        dialog.appendChild(box);
        document.body.appendChild(dialog);
        const authorInput = box.querySelector('[data-field="author"]');
        const manualAuthorInput = box.querySelector('[data-field="manual-author"]');
        const authorModeHint = box.querySelector('[data-role="author-mode-hint"]');
        const groupInput = box.querySelector('[data-field="group"]');
        authorInput.value = settings.authorId || '';
        manualAuthorInput.checked = settings.authorMode === 'manual';
        groupInput.value = settings.groupId || '';
        const updateAuthorMode = () => {
            const manual = manualAuthorInput.checked;
            authorInput.disabled = !manual;
            authorInput.style.opacity = manual ? '1' : '.6';
            authorModeHint.textContent = manual
                ? 'Ручной режим: скрытый комментарий будет отправлен от указанного ID.'
                : 'Автоматический режим: автор определяется по владельцу указанного API-токена.';
        };
        manualAuthorInput.addEventListener('change', updateAuthorMode);
        updateAuthorMode();

        const renderEmployees = () => {
            const host = box.querySelector('[data-role="employees"]');
            host.replaceChildren();
            if (!employees.length) {
                host.textContent = 'Список пуст. Нажмите «Загрузить сотрудников группы» или добавьте сотрудника вручную.';
                return;
            }
            normalizeEmployees(employees).forEach((employee) => {
                const row = document.createElement('div');
                Object.assign(row.style, { display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--okdesk-script-border-muted)' });
                const label = document.createElement('span');
                label.textContent = `${employee.name} (ID ${employee.id})`;
                label.style.flex = '1';
                const edit = document.createElement('button');
                edit.textContent = 'Изменить';
                edit.onclick = () => {
                    const name = prompt('ФИО сотрудника', employee.name);
                    const id = prompt('ID сотрудника', employee.id);
                    if (name?.trim() && Number(id) > 0) {
                        const index = employees.findIndex((item) => Number(item.id) === employee.id);
                        employees[index] = { id: Number(id), name: name.trim() };
                        renderEmployees();
                    }
                };
                const remove = document.createElement('button');
                remove.textContent = 'Удалить';
                remove.onclick = () => {
                    const index = employees.findIndex((item) => Number(item.id) === employee.id);
                    employees.splice(index, 1);
                    renderEmployees();
                };
                row.append(label, edit, remove);
                host.appendChild(row);
            });
        };
        renderEmployees();

        const renderStatuses = () => {
            const host = box.querySelector('[data-role="statuses"]');
            host.replaceChildren();
            if (!statuses.length) {
                host.textContent = 'Список пуст. Загрузите статусы из Okdesk или добавьте нужный код вручную.';
                return;
            }
            statuses.forEach((status, index) => {
                const row = document.createElement('div');
                Object.assign(row.style, { display: 'flex', gap: '8px', alignItems: 'end', padding: '8px 0', borderBottom: '1px solid var(--okdesk-script-border-muted)', flexWrap: 'wrap' });
                const name = document.createElement('input');
                name.type = 'text'; name.value = status.name; name.placeholder = 'Название статуса';
                Object.assign(name.style, { flex: '1 1 220px', minWidth: '160px', padding: '7px', boxSizing: 'border-box' });
                const code = document.createElement('input');
                code.type = 'text'; code.value = status.code; code.placeholder = 'Код статуса';
                Object.assign(code.style, { flex: '1 1 160px', minWidth: '140px', padding: '7px', boxSizing: 'border-box' });
                const remove = document.createElement('button');
                remove.type = 'button'; remove.textContent = 'Удалить';
                remove.onclick = () => { statuses.splice(index, 1); renderStatuses(); };
                const up = document.createElement('button');
                up.type = 'button'; up.textContent = '↑'; up.title = 'Переместить выше';
                up.disabled = index === 0;
                up.onclick = () => {
                    [statuses[index - 1], statuses[index]] = [statuses[index], statuses[index - 1]];
                    renderStatuses();
                };
                const down = document.createElement('button');
                down.type = 'button'; down.textContent = '↓'; down.title = 'Переместить ниже';
                down.disabled = index === statuses.length - 1;
                down.onclick = () => {
                    [statuses[index], statuses[index + 1]] = [statuses[index + 1], statuses[index]];
                    renderStatuses();
                };
                name.addEventListener('input', () => { status.name = name.value; });
                code.addEventListener('input', () => { status.code = code.value; });
                row.append(name, code, up, down, remove);
                host.appendChild(row);
            });
        };
        renderStatuses();

        box.querySelector('[data-action="load"]').onclick = async () => {
            try {
                const groupId = Number(groupInput.value);
                if (!groupId) {
                    throw new Error('укажите ID группы или выберите её через поиск');
                }
                const loaded = await loadGroupEmployees(groupId);
                employees.splice(0, employees.length, ...loaded);
                renderEmployees();
                showToast(`Загружено сотрудников: ${loaded.length}.`);
            } catch (error) {
                showToast(`Не удалось загрузить сотрудников: ${error.message}`, true);
            }
        };
        box.querySelector('[data-action="groups"]').onclick = () => {
            openGroupSearch(async (group) => {
                groupInput.value = group.id;
                const loaded = await loadGroupEmployees(group.id);
                employees.splice(0, employees.length, ...loaded);
                renderEmployees();
                showToast(`Выбрана группа «${group.name}». Загружено сотрудников: ${loaded.length}.`);
            });
        };
        box.querySelector('[data-action="add"]').onclick = () => {
            const name = prompt('ФИО сотрудника');
            const id = prompt('ID сотрудника');
            if (name?.trim() && Number(id) > 0) {
                employees.push({ id: Number(id), name: name.trim() });
                renderEmployees();
            }
        };
        box.querySelector('[data-action="load-statuses"]').onclick = async () => {
            try {
                const loaded = await loadIssueStatuses(false);
                statuses.splice(0, statuses.length, ...loaded);
                renderStatuses();
                showToast(`Загружено статусов: ${loaded.length}.`);
            } catch (error) {
                showToast(`Не удалось загрузить статусы: ${error.message}`, true);
            }
        };
        box.querySelector('[data-action="add-status"]').onclick = () => {
            statuses.push({ code: '', name: '', color: '' });
            renderStatuses();
        };
        box.querySelector('[data-action="save"]').onclick = () => {
            saveTransferSettings({
                authorId: Number(authorInput.value) || null,
                authorMode: manualAuthorInput.checked ? 'manual' : 'auto',
                groupId: Number(groupInput.value) || null,
                employees: normalizeEmployees(employees),
            });
            saveIssueStatuses(statuses);
            showToast('Настройки передачи заявок сохранены.');
            dialog.remove();
        };
        box.querySelector('[data-action="close"]').onclick = () => dialog.remove();
    }

    function openGroupSearch(onSelect) {
        const dialog = document.createElement('div');
        Object.assign(dialog.style, { position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.55)', font: '14px Arial,sans-serif' });
        const box = document.createElement('div');
        Object.assign(box.style, { width: '560px', maxWidth: 'calc(100% - 32px)', maxHeight: 'calc(100% - 64px)', padding: '18px', borderRadius: '8px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)', display: 'flex', flexDirection: 'column' });
        const title = document.createElement('h3');
        title.textContent = 'Выберите группу';
        title.style.marginTop = '0';
        const search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'Поиск по названию группы';
        Object.assign(search.style, { padding: '8px', marginBottom: '10px' });
        const list = document.createElement('div');
        Object.assign(list.style, { overflowY: 'auto', minHeight: '120px' });
        const close = document.createElement('button');
        close.textContent = 'Отмена';
        Object.assign(close.style, { alignSelf: 'flex-start', marginTop: '12px', padding: '7px 10px' });
        close.onclick = () => dialog.remove();
        box.append(title, search, list, close);
        dialog.appendChild(box);
        document.body.appendChild(dialog);
        search.focus();
        list.textContent = 'Загрузка групп...';

        apiRequest('/employees/groups').then((response) => {
            const groups = (Array.isArray(response) ? response : [])
                .filter((group) => group.active !== false)
                .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'ru'));
            const render = () => {
                const needle = search.value.trim().toLocaleLowerCase('ru');
                list.replaceChildren();
                groups.filter((group) => String(group.name || '').toLocaleLowerCase('ru').includes(needle)).forEach((group) => {
                    const button = document.createElement('button');
                    button.textContent = `${group.name} (ID ${group.id})`;
                    Object.assign(button.style, { display: 'block', width: '100%', padding: '8px 10px', border: '0', background: 'transparent', color: 'var(--okdesk-script-text)', textAlign: 'left', cursor: 'pointer' });
                    button.addEventListener('mouseenter', () => { button.style.background = 'var(--okdesk-script-highlight)'; });
                    button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; });
                    button.onclick = async () => {
                        try {
                            button.disabled = true;
                            await onSelect(group);
                            dialog.remove();
                        } catch (error) {
                            button.disabled = false;
                            showToast(`Не удалось выбрать группу: ${error.message}`, true);
                        }
                    };
                    list.appendChild(button);
                });
                if (!list.children.length) {
                    list.textContent = 'Группы не найдены.';
                }
            };
            search.addEventListener('input', render);
            render();
        }).catch((error) => {
            list.textContent = `Не удалось загрузить группы: ${error.message}`;
        });
    }

    function addMissingStandardTemplates(templates) {
        const direction = templates.find((item) => item.title === '🤝 Направление' && Array.isArray(item.children));
        const diagnostics = templates.find((item) => item.title === '🧩 ЗИП и диагностика' && Array.isArray(item.children));
        const warranty = templates.find((item) => item.title === '🛡️ Гарантия' && Array.isArray(item.children));
        const standardDirection = DEFAULT_TEMPLATES.find((item) => item.title === '🤝 Направление');
        const standardDiagnostics = DEFAULT_TEMPLATES.find((item) => item.title === '🧩 ЗИП и диагностика');
        const standardWarranty = DEFAULT_TEMPLATES.find((item) => item.title === '🛡️ Гарантия');
        const acronisTitle = '💿 Переустановка ОС через Acronis';
        const movedAcronis = direction?.children.find((item) => item.title === acronisTitle);
        if (movedAcronis) {
            direction.children = direction.children.filter((item) => item.title !== acronisTitle);
        }
        if (diagnostics && !diagnostics.children.some((item) => item.title === acronisTitle)) {
            const standardAcronis = standardDiagnostics?.children.find((item) => item.title === acronisTitle);
            diagnostics.children.push(structuredClone(movedAcronis || standardAcronis));
        }
        const powerSupplyTitle = '🔌 Внешний БП не по гарантии';
        if (warranty && !warranty.children.some((item) => item.title === powerSupplyTitle)) {
            const standardPowerSupply = standardWarranty?.children.find((item) => item.title === powerSupplyTitle);
            if (standardPowerSupply) warranty.children.push(structuredClone(standardPowerSupply));
        }
        if (!direction || !standardDirection) {
            return;
        }
        ['🚫 Не наше оборудование'].forEach((title) => {
            const standardTemplate = standardDirection.children.find((item) => item.title === title);
            if (standardTemplate && !direction.children.some((item) => item.title === title)) {
                direction.children.push(structuredClone(standardTemplate));
            }
        });
    }

    function openTemplateSettings() {
        openQuickReplySettings('insert');
    }

    function openTemplateFromSelection(selectedText) {
        const templates = getTemplates();
        const folders = new Map([['', templates]]);
        const dialog = document.createElement('div');
        dialog.dataset.okdeskScriptUi = 'true';
        Object.assign(dialog.style, {
            position: 'fixed', zIndex: '2147483648', inset: '0', display: 'grid', placeItems: 'center',
            overflowY: 'auto', padding: '16px', boxSizing: 'border-box', background: 'rgba(0,0,0,.6)', font: '14px Arial,sans-serif',
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            width: '620px', maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box',
            margin: 'auto', padding: '18px', borderRadius: '8px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)',
        });
        box.innerHTML = `
            <h3 style="margin:0 0 16px">Новый шаблон из выделенного текста</h3>
            <label data-field="title-label" style="display:block">Название<br><input data-field="title" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px"></label>
            <label style="display:block;margin-top:14px">Папка<br><select data-field="folder" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px"></select></label>
            <label style="display:block;margin-top:14px">Текст шаблона<br><textarea data-field="text" rows="10" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px;resize:vertical"></textarea></label>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px">
                <button type="button" data-action="cancel">Отмена</button>
                <button type="button" data-action="save">Сохранить шаблон</button>
            </div>`;
        const titleInput = box.querySelector('[data-field="title"]');
        const titleLabel = box.querySelector('[data-field="title-label"]');
        const titleField = createTemplateTitleField(titleLabel, titleInput);
        box.querySelector('h3').insertAdjacentElement('afterend', titleField);
        const folderSelect = box.querySelector('[data-field="folder"]');
        const rootOption = document.createElement('option');
        rootOption.value = '';
        rootOption.textContent = 'Без папки (верхний уровень)';
        folderSelect.appendChild(rootOption);
        const addFolders = (items, parentPath = [], parentKey = '') => items.forEach((item, index) => {
            if (!Array.isArray(item.children)) return;
            const key = `${parentKey}${index}`;
            const path = [...parentPath, item.title];
            folders.set(key, item.children);
            const option = document.createElement('option');
            option.value = key;
            option.textContent = path.join(' › ');
            folderSelect.appendChild(option);
            addFolders(item.children, path, `${key}.`);
        });
        addFolders(templates);
        const textInput = box.querySelector('[data-field="text"]');
        textInput.value = selectedText;
        const close = () => { closeTemplateEmojiPicker(); dialog.remove(); };
        box.querySelector('[data-action="cancel"]').onclick = close;
        box.querySelector('[data-action="save"]').onclick = () => {
            const title = titleInput.value.trim();
            const content = textInput.value.trim();
            if (!title) {
                titleInput.focus();
                showToast('Укажите название шаблона.', true);
                return;
            }
            if (!content) {
                textInput.focus();
                showToast('Текст шаблона пуст.', true);
                return;
            }
            (folders.get(folderSelect.value) || templates).push({ title, text: content });
            saveTemplates(templates);
            close();
            showToast('Шаблон сохранён.');
        };
        dialog.addEventListener('mousedown', (event) => { if (event.target === dialog) close(); });
        dialog.appendChild(box);
        document.body.appendChild(dialog);
        titleInput.focus();
    }

    function areTemplateTitlesFilled(items) {
        return items.every((item) => String(item.title || '').trim()
            && (!Array.isArray(item.children) || areTemplateTitlesFilled(item.children)));
    }

    function renderInsertionTemplateSettings(host, templates, state, onMoveToQuickReplies) {
        const title = document.createElement('h3');
        title.textContent = 'Шаблоны для вставки в комментарий';
        title.style.marginTop = '0';
        const search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'Поиск по названию и тексту шаблона';
        search.setAttribute('aria-label', 'Поиск шаблонов для вставки');
        search.value = state.search;
        Object.assign(search.style, { display: 'block', width: '100%', boxSizing: 'border-box', padding: '8px', marginBottom: '10px', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '4px', background: 'var(--okdesk-script-search)', color: 'var(--okdesk-script-text)' });
        const list = document.createElement('div');
        const controls = document.createElement('div');
        Object.assign(controls.style, { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' });
        const makeButton = (label, action, tooltip = '') => {
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = label; button.title = tooltip;
            Object.assign(button.style, { minHeight: '30px', padding: '4px 8px' });
            button.onclick = action;
            return button;
        };
        const matches = (item, needle, parentMatches = false) => {
            if (!needle || parentMatches) return true;
            if (`${item.title || ''} ${item.text || ''}`.toLocaleLowerCase('ru').includes(needle)) return true;
            return Array.isArray(item.children) && item.children.some((child) => matches(child, needle));
        };
        const renderItems = (items, level = 0, parentMatches = false) => {
            const needle = state.search.trim().toLocaleLowerCase('ru');
            items.forEach((item, index) => {
                if (!matches(item, needle, parentMatches)) return;
                const isFolder = Array.isArray(item.children);
                const row = document.createElement('div');
                row.okdeskReorderItem = item;
                Object.assign(row.style, { marginTop: '10px', marginLeft: `${level * 18}px`, padding: '12px', border: '1px solid var(--okdesk-script-border-soft)', borderRadius: '6px', background: 'var(--okdesk-script-raised)' });
                const top = document.createElement('div');
                Object.assign(top.style, { display: 'flex', alignItems: 'end', gap: '8px' });
                const actions = document.createElement('div');
                Object.assign(actions.style, { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '6px', marginTop: '8px' });
                if (isFolder) {
                    const toggle = makeButton(needle || state.expanded.has(item) ? '▾' : '▸', () => {
                        if (state.expanded.has(item)) state.expanded.delete(item);
                        else state.expanded.add(item);
                        render();
                    }, needle ? 'Во время поиска подходящие папки раскрыты' : 'Свернуть или развернуть папку');
                    toggle.disabled = Boolean(needle);
                    toggle.setAttribute('aria-expanded', String(Boolean(needle) || state.expanded.has(item)));
                    Object.assign(toggle.style, { width: '30px', height: '32px', padding: '0', alignSelf: 'end' });
                    top.appendChild(toggle);
                }
                const label = document.createElement('label');
                label.textContent = isFolder ? `Папка (${item.children.length})` : 'Название шаблона';
                Object.assign(label.style, { flex: '1', minWidth: '210px' });
                const input = document.createElement('input');
                input.value = item.title || '';
                Object.assign(input.style, { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '7px' });
                input.addEventListener('input', () => { item.title = input.value; });
                label.appendChild(input);
                top.appendChild(createTemplateTitleField(label, input));
                actions.append(
                    makeButton('↑', () => {
                        if (!index) return;
                        animateReorderedRows(list, item, () => {
                            [items[index - 1], items[index]] = [items[index], items[index - 1]];
                        }, render);
                    }, 'Выше'),
                    makeButton('↓', () => {
                        if (index === items.length - 1) return;
                        animateReorderedRows(list, item, () => {
                            [items[index], items[index + 1]] = [items[index + 1], items[index]];
                        }, render);
                    }, 'Ниже'),
                    makeButton('Удалить', () => { items.splice(index, 1); render(); }),
                );
                if (isFolder) {
                    actions.appendChild(makeButton('+ Шаблон', () => {
                        item.children.push({ title: '', text: '' });
                        state.expanded.add(item);
                        render();
                    }, 'Добавить шаблон в папку'));
                } else {
                    const pinLabel = document.createElement('label');
                    Object.assign(pinLabel.style, { display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: 'auto', whiteSpace: 'nowrap' });
                    const pin = document.createElement('input');
                    pin.type = 'checkbox';
                    pin.checked = item.pinned === true;
                    pin.addEventListener('change', () => { item.pinned = pin.checked; });
                    pinLabel.append(pin, ' Закрепить');
                    actions.prepend(pinLabel);
                    actions.appendChild(makeButton('→ В быстрые ответы', () => onMoveToQuickReplies(item, items, index), 'Перенести шаблон в быстрые ответы'));
                }
                row.append(top, actions);
                if (!isFolder) {
                    const textLabel = document.createElement('label');
                    textLabel.textContent = 'Текст шаблона';
                    Object.assign(textLabel.style, { display: 'block', marginTop: '10px' });
                    const textarea = document.createElement('textarea');
                    textarea.value = item.text || '';
                    textarea.rows = 5;
                    Object.assign(textarea.style, { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '7px', resize: 'vertical' });
                    textarea.addEventListener('input', () => { item.text = textarea.value; });
                    textLabel.appendChild(textarea);
                    row.appendChild(textLabel);
                }
                list.appendChild(row);
                if (isFolder && (needle || state.expanded.has(item))) {
                    const folderMatches = parentMatches || (needle && String(item.title || '').toLocaleLowerCase('ru').includes(needle));
                    renderItems(item.children, level + 1, folderMatches);
                }
            });
        };
        const render = () => {
            closeTemplateEmojiPicker();
            list.replaceChildren();
            renderItems(templates);
            if (!list.children.length && state.search.trim()) {
                const empty = document.createElement('div');
                empty.textContent = 'Шаблоны не найдены';
                Object.assign(empty.style, { padding: '12px', color: 'var(--okdesk-script-muted)' });
                list.appendChild(empty);
            }
            return list;
        };
        search.addEventListener('input', () => { state.search = search.value; render(); });
        controls.append(
            makeButton('+ Добавить шаблон', () => { templates.push({ title: '', text: '' }); render(); }),
            makeButton('+ Добавить папку', () => { templates.push({ title: '', children: [] }); render(); }),
            makeButton('Стандартные', () => {
                if (!confirm('Заменить текущие шаблоны стандартным набором?')) return;
                templates.splice(0, templates.length, ...structuredClone(DEFAULT_TEMPLATES));
                render();
            }),
        );
        host.append(title, search, list, controls);
        render();
    }

    function attachTemplateEditors() {
        document.querySelectorAll('iframe.cke_wysiwyg_frame').forEach((iframe) => {
            if (iframe.dataset.okdeskTemplatesAttached) return;
            try {
                const editorDocument = iframe.contentDocument;
                if (!editorDocument) return;
                iframe.dataset.okdeskTemplatesAttached = 'true';
                editorDocument.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    showTemplateMenu(iframe, editorDocument, event.clientX, event.clientY);
                });
                editorDocument.addEventListener('mousedown', hideTemplateMenu);
            } catch (_) { /* Editor iframe is not ready yet. */ }
        });
    }

    function ensureContextMenuHoverStyle() {
        if (document.getElementById('okdesk-context-hover-style')) return;
        const style = document.createElement('style');
        style.id = 'okdesk-context-hover-style';
        style.textContent = `
            #okdesk-template-menu button:hover,
            #okdesk-field-filler-menu button:hover { background: var(--okdesk-script-highlight) !important; }
            #okdesk-template-menu button:focus-visible,
            #okdesk-field-filler-menu button:focus-visible { outline: 2px solid #83baff; outline-offset: -2px; }
            #okdesk-template-menu input { user-select: text; }
        `;
        document.head.appendChild(style);
    }

    function showTemplateMenu(iframe, editorDocument, x, y) {
        hideTemplateMenu();
        ensureContextMenuHoverStyle();
        templateMenu = document.createElement('div');
        templateMenu.id = 'okdesk-template-menu';
        templateMenu.dataset.okdeskScriptUi = 'true';
        Object.assign(templateMenu.style, { position: 'fixed', zIndex: '2147483647', minWidth: '240px', padding: '6px', border: '1px solid var(--okdesk-script-border-menu)', borderRadius: '6px', background: 'var(--okdesk-script-surface)', color: 'var(--okdesk-script-text)', boxShadow: '0 8px 24px rgba(0,0,0,.35)', userSelect: 'none' });
        templateMenu.addEventListener('mousedown', (event) => event.stopPropagation());
        templateMenu.addEventListener('click', (event) => event.stopPropagation());
        const selection = editorDocument.getSelection();
        const insertionRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
        const selectedEditorText = selection?.toString().trim() || '';
        const iframeRect = iframe.getBoundingClientRect();
        const menuLeft = iframeRect.left + x;
        const menuTop = iframeRect.top + y;
        const makeButton = (label, action, color = 'var(--okdesk-script-text)') => {
            const button = document.createElement('button');
            button.textContent = label;
            Object.assign(button.style, { display: 'block', width: '100%', padding: '8px', border: '0', background: 'transparent', color, textAlign: 'left', cursor: 'pointer' });
            button.addEventListener('click', action);
            return button;
        };
        const renderEmployeeTagMenu = (returnItems, parentItems) => {
            templateMenu.replaceChildren();
            templateMenu.appendChild(makeButton('← Назад', () => render(returnItems, parentItems)));
            const title = document.createElement('div');
            title.textContent = 'Отметить сотрудника:';
            title.style.margin = '8px 4px';
            const list = document.createElement('div');
            list.textContent = 'Загрузка сотрудников...';
            Object.assign(list.style, { maxHeight: '510px', overflowY: 'auto', marginBottom: '8px' });
            templateMenu.append(title, list, makeButton('✕ Закрыть', hideTemplateMenu, 'var(--okdesk-script-danger)'));
            getTransferEmployees().then((employees) => {
                if (!templateMenu?.isConnected || !list.isConnected) {
                    return;
                }
                list.replaceChildren();
                employees.forEach((employee) => {
                    list.appendChild(makeButton(`${employee.name} (ID ${employee.id})`, () => {
                        insertEmployeeMention(editorDocument, insertionRange, employee);
                        hideTemplateMenu();
                    }));
                });
                keepMenuInViewport(templateMenu, menuLeft, menuTop);
            }).catch((error) => {
                list.textContent = `Ошибка: ${error.message}`;
                keepMenuInViewport(templateMenu, menuLeft, menuTop);
            });
        };
        const allTemplates = getTemplates();
        const usage = getTemplateUsage();
        const render = (items, parentItems = null) => {
            templateMenu.replaceChildren();
            if (parentItems) {
                templateMenu.appendChild(makeButton('← Назад', () => render(parentItems)));
            }
            if (!parentItems) {
                const search = document.createElement('input');
                search.type = 'search';
                search.placeholder = 'Поиск по названию и тексту';
                search.setAttribute('aria-label', 'Поиск шаблонов');
                Object.assign(search.style, { display: 'block', width: '100%', boxSizing: 'border-box', marginBottom: '6px', padding: '7px', border: '1px solid var(--okdesk-script-border-input)', borderRadius: '4px', background: 'var(--okdesk-script-search)', color: 'var(--okdesk-script-text)' });
                templateMenu.appendChild(search);
                templateMenu.appendChild(makeButton('👤 Тегнуть сотрудника', () => renderEmployeeTagMenu(items, parentItems)));
                const divider = document.createElement('div');
                Object.assign(divider.style, { margin: '6px 4px', borderTop: '1px solid var(--okdesk-script-divider)' });
                templateMenu.appendChild(divider);
            }
            if (!parentItems && selectedEditorText) {
                templateMenu.append(
                    makeButton('Сделать шаблоном', () => {
                        hideTemplateMenu();
                        openTemplateFromSelection(selectedEditorText);
                    }),
                    makeButton('💬 Выделенное цитатой', () => {
                        formatEditorSelection(editorDocument, insertionRange, selectedEditorText, 'quote');
                        hideTemplateMenu();
                    }),
                    makeButton('🙈 Выделенное спойлером', () => {
                        formatEditorSelection(editorDocument, insertionRange, selectedEditorText, 'spoiler');
                        hideTemplateMenu();
                    }),
                );
                const selectionDivider = document.createElement('div');
                Object.assign(selectionDivider.style, { margin: '6px 4px', borderTop: '1px solid var(--okdesk-script-divider)' });
                templateMenu.appendChild(selectionDivider);
            }
            if (!parentItems) {
                const heading = document.createElement('div');
                heading.textContent = 'Шаблоны';
                Object.assign(heading.style, { margin: '8px 4px 4px', color: 'var(--okdesk-script-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' });
                templateMenu.appendChild(heading);
            }
            const list = document.createElement('div');
            templateMenu.appendChild(list);
            const appendItem = (item, label) => {
                list.appendChild(makeButton(`${Array.isArray(item.children) ? '▸ ' : item.pinned === true ? '★ ' : ''}${label}`, () => {
                    if (Array.isArray(item.children)) {
                        render(item.children, items);
                        return;
                    }
                    insertTemplateText(editorDocument, insertionRange, item.text || '');
                    recordTemplateUse(item);
                    hideTemplateMenu();
                }));
            };
            const renderList = (query = '') => {
                list.replaceChildren();
                if (!query) {
                    sortDisplayedTemplates(items).forEach((item) => appendItem(item, item.title));
                } else {
                    const needle = query.toLocaleLowerCase('ru');
                    const matches = [];
                    const collect = (nodes, path = '') => nodes.forEach((item) => {
                        const label = path ? `${path} / ${item.title}` : item.title;
                        if (Array.isArray(item.children)) {
                            collect(item.children, label);
                        } else {
                            const score = templateSearchScore(item, needle, usage);
                            if (score > -Infinity) matches.push({ item, label, score, order: matches.length });
                        }
                    });
                    collect(items);
                    matches.sort((left, right) => right.score - left.score || left.order - right.order)
                        .forEach(({ item, label }) => appendItem(item, label));
                    if (!list.children.length) {
                        const empty = document.createElement('div');
                        empty.textContent = 'Шаблоны не найдены';
                        Object.assign(empty.style, { padding: '8px', color: 'var(--okdesk-script-muted)' });
                        list.appendChild(empty);
                    }
                }
                keepMenuInViewport(templateMenu, menuLeft, menuTop);
            };
            if (!parentItems) {
                templateMenu.querySelector('input[type="search"]').addEventListener('input', (event) => renderList(event.target.value.trim()));
            }
            renderList();
            templateMenu.appendChild(makeButton('✕ Закрыть', hideTemplateMenu, 'var(--okdesk-script-danger)'));
            if (templateMenu.isConnected) {
                keepMenuInViewport(templateMenu, menuLeft, menuTop);
            }
        };
        render(allTemplates);
        document.body.appendChild(templateMenu);
        keepMenuInViewport(templateMenu, menuLeft, menuTop);
    }

    function getCkeditorInstance(editorDocument) {
        const frame = editorDocument.defaultView?.frameElement;
        const instances = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).CKEDITOR?.instances;
        if (!frame || !instances) return null;
        return Object.values(instances).find((instance) =>
            instance.status === 'ready' && instance.container?.$?.contains(frame)) || null;
    }

    function insertEditorHtml(editorDocument, insertionRange, html, mode = 'html') {
        const selection = editorDocument.getSelection();
        editorDocument.body.focus();
        if (selection && insertionRange) {
            selection.removeAllRanges();
            selection.addRange(insertionRange);
        }
        const editor = getCkeditorInstance(editorDocument);
        if (editor) {
            editor.insertHtml(html, mode);
            editor.fire('change');
            editor.updateElement();
            return;
        }
        editorDocument.execCommand('insertHTML', false, html);
        editorDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
        editorDocument.body.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function insertTemplateText(editorDocument, insertionRange, text) {
        insertEditorHtml(editorDocument, insertionRange, escapeHtml(text).replace(/\r?\n/g, '<br>'), 'text');
    }

    function formatEditorSelection(editorDocument, insertionRange, selectedText, type) {
        const html = type === 'spoiler' ? createSpoilerHtml(selectedText) : createQuoteHtml(selectedText);
        insertEditorHtml(editorDocument, insertionRange, html);
    }

    function insertEmployeeMention(editorDocument, insertionRange, employee) {
        const mention = `<br><span>[~employee${employee.id}|${escapeHtml(employee.name)}]</span>&zwj;&nbsp;`;
        insertEditorHtml(editorDocument, insertionRange, mention);
    }

    function escapeHtml(text) {
        const element = document.createElement('div');
        element.textContent = text;
        return element.innerHTML;
    }

    function formatQuickReplyContent(text) {
        const mentions = [];
        let source = String(text || '').replace(/\[~employee(\d+)\|([^\]\r\n]+)\](?:[ \t]|&zwj;|&#8205;|\u200d|&nbsp;|\u00a0)*/gi, (_match, employeeId, employeeName) => {
            const token = `__OKDESK_MENTION_${mentions.length}__`;
            mentions.push({ token, html: `<span>[~employee${employeeId}|${escapeHtml(employeeName.trim())}]</span>&zwj;&nbsp;` });
            return token;
        });
        source = source.replace(/<br\s*\/?\s*>/gi, '\n').replace(/^(?:\s*\r?\n)+/, '');
        let content = escapeHtml(source).replace(/\r?\n/g, '<br>');
        mentions.forEach((mention) => {
            content = content.split(mention.token).join(mention.html);
        });
        return content;
    }

    function showContextMenu(x, y, selectedText, issueId) {
        hideMenus();
        ensureContextMenuHoverStyle();
        menu = document.createElement('div');
        menu.id = 'okdesk-field-filler-menu';
        menu.addEventListener('click', (event) => event.stopPropagation());
        menu.innerHTML = `
            <button data-action="copy">Копировать выделенное</button>
            <button data-action="open-portal">Открыть на портале POScenter</button>
            <div class="okdesk-menu-divider"><span>Тема заявки</span></div>
            <button data-action="set-title">Сделать темой заявки</button>
            <div class="okdesk-menu-divider"><span>Шаблоны</span></div>
            <button data-action="make-template">Сделать шаблоном</button>
            <div class="okdesk-menu-divider"><span>Поля заявки</span></div>
            <button data-action="serial">Записать в «Заводской номер»</button>
            <button data-action="spare">Записать в «Код ЗИП»</button>
            <button data-action="warranty-yes">Установить «Гарантия»</button>
            <button data-action="warranty-no">Установить «Не гарантия»</button>
            <button data-action="toggle-comment" class="okdesk-menu-divider" aria-expanded="false" aria-controls="okdesk-comment-actions">▸ Комментарий</button>
            <div id="okdesk-comment-actions" hidden>
                <button data-action="insert-quote">Добавить в комментарий цитатой</button>
                <button data-action="insert-spoiler">Добавить в комментарий спойлером</button>
                <button data-action="copy-quote">Скопировать HTML цитаты</button>
                <button data-action="copy-spoiler">Скопировать HTML спойлера</button>
            </div>
        `;
        Object.assign(menu.style, {
            position: 'fixed', zIndex: '2147483647', left: `${x}px`, top: `${y}px`,
            width: '290px', maxWidth: 'calc(100vw - 16px)', boxSizing: 'border-box', overflowX: 'hidden',
            padding: '6px', border: '1px solid var(--okdesk-script-border-menu)',
            borderRadius: '6px', background: 'var(--okdesk-script-surface)', boxShadow: '0 8px 24px rgba(0,0,0,.35)', userSelect: 'none',
        });
        menu.querySelectorAll('button').forEach((button) => {
            Object.assign(button.style, {
                display: 'block', width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '0',
                background: 'transparent', color: 'var(--okdesk-script-text)', textAlign: 'left', cursor: 'pointer',
            });
            button.addEventListener('click', async () => {
                const action = button.dataset.action;
                if (action === 'toggle-comment') {
                    const expanded = button.getAttribute('aria-expanded') !== 'true';
                    button.setAttribute('aria-expanded', String(expanded));
                    button.firstChild.textContent = `${expanded ? '▾' : '▸'} Комментарий`;
                    menu.querySelector('#okdesk-comment-actions').hidden = !expanded;
                    keepMenuInViewport(menu, x, y);
                    return;
                }
                hideContextMenu();
                if (action === 'copy') {
                    await copyText(selectedText);
                } else if (action === 'make-template') {
                    openTemplateFromSelection(selectedText);
                } else if (action === 'open-portal') {
                    openOnPoscenterPortal(selectedText);
                } else if (action === 'set-title') {
                    await setIssueTitleFromSelection(issueId, selectedText);
                } else if (action === 'insert-quote') {
                    appendFormattedTextToComment(selectedText, 'quote');
                } else if (action === 'insert-spoiler') {
                    appendFormattedTextToComment(selectedText, 'spoiler');
                } else if (action === 'copy-quote') {
                    await copyHtml(createQuoteHtml(selectedText), selectedText);
                    showToast('Цитата скопирована.');
                } else if (action === 'copy-spoiler') {
                    await copyHtml(createSpoilerHtml(selectedText), selectedText);
                    showToast('Спойлер скопирован.');
                } else if (action === 'serial') {
                    await updateParameter(issueId, FIELD.serialNumber, selectedText, 'Заводской номер');
                } else if (action === 'spare') {
                    await updateParameter(issueId, FIELD.sparePartCode, selectedText, 'Код ЗИП');
                } else if (action === 'warranty-yes') {
                    await updateParameter(issueId, FIELD.warranty, true, 'Гарантия');
                } else if (action === 'warranty-no') {
                    await updateParameter(issueId, FIELD.warranty, false, 'Не гарантия');
                }
            });
        });
        menu.querySelectorAll('.okdesk-menu-divider').forEach((divider) => {
            Object.assign(divider.style, {
                display: 'flex', alignItems: 'center', gap: '8px', margin: '7px 0 4px',
                color: 'var(--okdesk-script-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                letterSpacing: '.04em',
            });
            const line = document.createElement('span');
        Object.assign(line.style, { flex: '1', borderTop: '1px solid var(--okdesk-script-divider)' });
            divider.appendChild(line);
        });
        document.body.appendChild(menu);
        keepMenuInViewport(menu, x, y);
    }

    async function setIssueTitleFromSelection(issueId, selectedText, equipmentNameOverride = '') {
        const topic = String(selectedText || '').replace(/\s+/g, ' ').trim();
        const equipmentNames = getIssueEquipmentNames();
        if (!topic) return;
        try {
            const issue = await apiRequest(`/issues/${issueId}`);
            const equipmentName = equipmentNameOverride || (equipmentNames.length === 1 ? equipmentNames[0] : '');
            const updatedTitle = buildEquipmentIssueTitle(topic, equipmentName, await getIssueDomainLabel(issue));
            if (updatedTitle.length > 500) {
                throw new Error('итоговое название длиннее 500 символов');
            }
            await apiRequest(`/issues/${issueId}`, {
                method: 'PATCH',
                body: { issue: { title: updatedTitle } },
            });
            showToast('Тема заявки изменена.');
            window.setTimeout(() => {
                if (getIssueId() === issueId) location.reload();
            }, 550);
        } catch (error) {
            console.error('Okdesk selected title:', error);
            showToast(`Не удалось изменить тему: ${error.message}`, true);
        }
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('Текст скопирован.');
        } catch (_) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
            showToast('Текст скопирован.');
        }
    }

    function openOnPoscenterPortal(text) {
        const query = text.trim();
        if (!query) return;
        const url = `https://optposcenter.ru/catalog/?q=catalog&searchval=${encodeURIComponent(query)}`;
        const opened = window.open(url, '_blank', 'noopener');
        if (!opened) showToast('Браузер заблокировал новую вкладку. Разрешите всплывающие окна для Okdesk.', true);
    }

    async function copyHtml(html, plainText) {
        if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
            try {
                await navigator.clipboard.write([new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' }),
                })]);
                return;
            } catch (_) { /* Use the text fallback below. */ }
        }
        await copyText(html);
    }

    function createQuoteHtml(text) {
        return `<blockquote><p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p></blockquote>`;
    }

    function createSpoilerHtml(text) {
        const content = escapeHtml(text).replace(/\r?\n/g, '<br>');
        return `<div class="ckeditor-spoiler"><div class="ckeditor-spoiler-title"><div class="ckeditor-spoiler-hide-icon ckeditor-spoiler-toggle">&nbsp;</div></div><div class="ckeditor-spoiler-content"><p>${content}</p></div></div>`;
    }

    function hideContextMenu() {
        menu?.remove();
        menu = null;
    }

    function hideMenus() {
        hideContextMenu();
        hideTemplateMenu();
    }

    function keepMenuInViewport(target, preferredLeft, preferredTop) {
        const margin = 8;
        target.style.maxHeight = `${Math.max(140, window.innerHeight - margin * 2)}px`;
        target.style.overflowY = 'auto';
        const rect = target.getBoundingClientRect();
        const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - rect.width - margin));
        const top = Math.max(margin, Math.min(preferredTop, window.innerHeight - rect.height - margin));
        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
    }

    function hideTemplateMenu() {
        templateMenu?.remove();
        templateMenu = null;
    }

    function addSendHints() {
        document.querySelectorAll('button, input[type="submit"], a').forEach((control) => {
            if (!isCommentSendControl(control) || control.dataset.okdeskSendHint) {
                return;
            }
            control.dataset.okdeskSendHint = 'true';
            control.removeAttribute('title');
            control.setAttribute('data-original-title', 'ПКМ: смена статуса при отправке');
            control.setAttribute('data-bs-original-title', 'ПКМ: смена статуса при отправке');
            control.setAttribute('aria-label', 'Отправить. ПКМ: смена статуса при отправке');
            control.addEventListener('mouseenter', () => showSendHint(control));
            control.addEventListener('mouseleave', hideSendHint);
            control.addEventListener('click', hideSendHint);
        });
    }

    function showSendHint(control) {
        hideSendHint();
        const rect = control.getBoundingClientRect();
        sendHint = document.createElement('div');
        sendHint.textContent = 'ПКМ: смена статуса при отправке';
        Object.assign(sendHint.style, {
            position: 'fixed', zIndex: '2147483647', left: `${rect.left}px`, top: `${rect.bottom + 7}px`,
            padding: '6px 9px', borderRadius: '4px', background: 'var(--okdesk-script-tooltip)', color: 'var(--okdesk-script-text)',
            border: '1px solid #58708a', boxShadow: '0 4px 12px rgba(0,0,0,.3)',
            font: '12px Arial, sans-serif', whiteSpace: 'nowrap', pointerEvents: 'none',
        });
        document.body.appendChild(sendHint);
        const hintRect = sendHint.getBoundingClientRect();
        if (hintRect.right > window.innerWidth - 8) {
            sendHint.style.left = `${window.innerWidth - hintRect.width - 8}px`;
        }
    }

    function hideSendHint() {
        sendHint?.remove();
        sendHint = null;
    }

    function scheduleVideoEnhancement() {
        window.clearTimeout(videoScanTimer);
        videoScanTimer = window.setTimeout(enhanceVideoAttachments, 300);
    }

    async function enhanceVideoAttachments() {
        const issueId = getIssueId();
        const token = GM_getValue(API_TOKEN_KEY, '');
        if (!issueId || !token) {
            return;
        }
        if (videoAttachmentIssueId !== issueId) {
            if (videoLoadPromise) {
                await videoLoadPromise;
                if (videoAttachmentIssueId !== issueId) {
                    return;
                }
            } else {
                videoLoadPromise = (async () => {
                    try {
                        const [issue, comments] = await Promise.all([
                            getApiJson(`/api/v1/issues/${issueId}?api_token=${encodeURIComponent(token)}`),
                            getApiJson(`/api/v1/issues/${issueId}/comments?api_token=${encodeURIComponent(token)}`),
                        ]);
                        videoAttachments = new Map();
                        attachmentLinkFiles = new Map();
                        const allAttachments = [
                            ...(issue.attachments || []),
                            ...((Array.isArray(comments) ? comments : comments.data || []).flatMap((comment) => comment.attachments || [])),
                        ];
                        allAttachments.forEach((attachment) => {
                            if (isVideoFile(attachment.attachment_file_name)) {
                                videoAttachments.set(String(attachment.id), attachment);
                            }
                            if (isAttachmentLinkFile(attachment.attachment_file_name)) {
                                attachmentLinkFiles.set(String(attachment.id), attachment);
                            }
                        });
                        videoAttachmentIssueId = issueId;
                    } catch (error) {
                        console.warn('Okdesk video attachment scan:', error);
                    } finally {
                        videoLoadPromise = null;
                    }
                })();
                await videoLoadPromise;
                if (videoAttachmentIssueId !== issueId) {
                    return;
                }
            }
        }

        document.querySelectorAll('a[href]').forEach((link) => {
            const attachment = findVideoAttachment(link);
            if (!attachment || link.dataset.okdeskVideoAttached) {
                return;
            }
            link.dataset.okdeskVideoAttached = 'true';
            link.title = 'ПКМ: просмотреть видео или скачать';
            link.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                showVideoMenu(event.clientX, event.clientY, issueId, attachment, token);
            }, true);

            const playButton = document.createElement('button');
            playButton.textContent = 'Воспроизвести';
            playButton.title = 'Открыть видео в новой вкладке браузера';
            Object.assign(playButton.style, {
                position: 'fixed', zIndex: '2147483645', padding: '6px 10px', border: '1px solid var(--okdesk-script-highlight)',
                borderRadius: '4px', background: 'var(--okdesk-script-highlight)', color: 'var(--okdesk-script-text)', cursor: 'pointer',
                fontSize: '12px', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(0,0,0,.3)',
            });
            playButton.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await openVideoInBrowser(issueId, attachment, token);
            });
            const placePlayButton = () => {
                if (!link.isConnected) {
                    playButton.remove();
                    return;
                }
                const rect = link.getBoundingClientRect();
                playButton.style.left = `${Math.min(rect.right + 8, window.innerWidth - playButton.offsetWidth - 8)}px`;
                playButton.style.top = `${rect.top + Math.max(0, (rect.height - playButton.offsetHeight) / 2)}px`;
            };
            document.body.appendChild(playButton);
            placePlayButton();
            document.addEventListener('scroll', placePlayButton, true);
            window.addEventListener('resize', placePlayButton);
        });

        document.querySelectorAll('a[href]').forEach((link) => {
            const attachment = findAttachmentByLink(link, attachmentLinkFiles);
            if (!attachment || link.dataset.okdeskAttachmentLinkAttached) {
                return;
            }
            link.dataset.okdeskAttachmentLinkAttached = 'true';
            addAttachmentLinkButton(link, issueId, attachment, token);
        });
        enhanceAttachmentPreviewModal(issueId, token);
    }

    function isVideoFile(name) {
        return /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(String(name || ''));
    }

    function isAttachmentLinkFile(name) {
        return /^narod_attachment_links\.html?$/i.test(String(name || '').trim());
    }

    function findVideoAttachment(link) {
        return findAttachmentByLink(link, videoAttachments);
    }

    function findAttachmentByLink(link, attachments) {
        const href = link.getAttribute('href') || '';
        const label = (link.textContent || '').trim();
        for (const [attachmentId, attachment] of attachments) {
            if (href.includes(`/attachments/${attachmentId}`) || label.includes(attachment.attachment_file_name)) {
                return attachment;
            }
        }
        return null;
    }

    function addAttachmentLinkButton(link, issueId, attachment, token) {
        const button = document.createElement('button');
        button.textContent = 'Добавить ссылку';
        Object.assign(button.style, {
            position: 'fixed', zIndex: '2147483645', padding: '6px 10px', border: '1px solid #4f8a63',
            borderRadius: '4px', background: 'var(--okdesk-script-primary-alt2)', color: 'var(--okdesk-script-text)', cursor: 'pointer', fontSize: '12px',
            whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(0,0,0,.3)', opacity: '0', pointerEvents: 'none',
            transition: 'opacity .15s ease',
        });
        const placeButton = () => {
            if (!link.isConnected) {
                button.remove();
                return;
            }
            const rect = link.getBoundingClientRect();
            button.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - button.offsetWidth - 8))}px`;
            button.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - button.offsetHeight - 8)}px`;
        };
        const showButton = () => {
            placeButton();
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
        };
        link.addEventListener('mouseenter', showButton);
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            try {
                button.disabled = true;
                button.textContent = 'Чтение ссылки...';
                const links = await extractLinksFromAttachment(issueId, attachment, token);
                if (!links.length) {
                    throw new Error('в файле не найдены внешние ссылки');
                }
                if (links.length === 1) {
                    await addAttachmentLinkAsPrivateComment(issueId, links[0]);
                    showToast('Ссылка скопирована и добавлена скрытым комментарием.');
                } else {
                    showAttachmentLinkPicker(links, 'Выберите ссылку для добавления в комментарий', async (url) => {
                        await addAttachmentLinkAsPrivateComment(issueId, url);
                        return 'Ссылка скопирована и добавлена скрытым комментарием.';
                    });
                }
            } catch (error) {
                console.error('Okdesk attachment link:', error);
                showToast(`Не удалось извлечь ссылку: ${error.message}`, true);
            } finally {
                button.disabled = false;
                button.textContent = 'Добавить ссылку';
            }
        });
        document.body.appendChild(button);
        document.addEventListener('scroll', placeButton, true);
        window.addEventListener('resize', placeButton);
    }

    async function extractLinksFromAttachment(issueId, attachment, token) {
        const url = await getAttachmentUrl(issueId, attachment.id, token);
        const html = await getTextWithTampermonkey(url);
        const documentFromFile = new DOMParser().parseFromString(html, 'text/html');
        const fromAnchors = [...documentFromFile.querySelectorAll('a[href]')]
            .map((anchor) => anchor.getAttribute('href')?.trim())
            .filter((href) => /^https?:\/\//i.test(href));
        const fromText = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
        return [...new Set([...fromAnchors, ...fromText])];
    }

    async function sendAttachmentLinkAsPrivateComment(issueId, url) {
        const authorId = await getPrivateCommentAuthorId(getTransferSettings());
        const safeUrl = escapeHtml(url);
        await apiRequest(`/issues/${issueId}/comments`, {
            method: 'POST',
            body: {
                comment: {
                    content: `Ссылка из вложения клиента: <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`,
                    public: false,
                    author_id: authorId,
                    author_type: 'employee',
                },
            },
        });
    }

    async function addAttachmentLinkAsPrivateComment(issueId, url) {
        await copyTextToClipboard(url);
        await sendAttachmentLinkAsPrivateComment(issueId, url);
    }

    function copyTextToClipboard(text) {
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(text, 'text');
            return Promise.resolve();
        }
        return navigator.clipboard.writeText(text);
    }

    function getTextWithTampermonkey(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error(`файл недоступен (HTTP ${response.status})`));
                    }
                },
                onerror: () => reject(new Error('не удалось загрузить вложение')),
                ontimeout: () => reject(new Error('истекло время ожидания вложения')),
            });
        });
    }

    function showAttachmentLinkPicker(links, titleText, onSelect) {
        hideMenus();
        menu = document.createElement('div');
        menu.id = 'okdesk-field-filler-menu';
        Object.assign(menu.style, {
            position: 'fixed', zIndex: '2147483647', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(620px, calc(100vw - 32px))', maxHeight: 'min(420px, calc(100vh - 32px))', overflowY: 'auto',
            padding: '12px', border: '1px solid var(--okdesk-script-border-menu)', borderRadius: '6px', background: 'var(--okdesk-script-surface)',
            boxShadow: '0 8px 24px rgba(0,0,0,.45)',
        });
        const title = document.createElement('div');
        title.textContent = titleText;
        Object.assign(title.style, { color: 'var(--okdesk-script-text)', marginBottom: '8px', fontWeight: '600' });
        menu.appendChild(title);
        links.forEach((url) => {
            const linkButton = document.createElement('button');
            linkButton.textContent = url;
            Object.assign(linkButton.style, {
                display: 'block', width: '100%', padding: '8px', marginBottom: '6px', border: '1px solid #445160',
                borderRadius: '4px', background: 'var(--okdesk-script-raised)', color: 'var(--okdesk-script-text)', textAlign: 'left', cursor: 'pointer',
                overflowWrap: 'anywhere',
            });
            linkButton.addEventListener('click', async () => {
                linkButton.disabled = true;
                try {
                    const message = await onSelect(url);
                    hideMenus();
                    showToast(message || 'Ссылка обработана.');
                } catch (error) {
                    console.error('Okdesk attachment link:', error);
                    showToast(`Не удалось добавить ссылку: ${error.message}`, true);
                    linkButton.disabled = false;
                }
            });
            menu.appendChild(linkButton);
        });
        document.body.appendChild(menu);
    }

    function enhanceAttachmentPreviewModal(issueId, token) {
        document.querySelectorAll('button, a').forEach((downloadControl) => {
            if (downloadControl.dataset.okdeskAttachmentCopyAttached || !/скачать\s+файл/i.test(downloadControl.textContent || '')) {
                return;
            }
            const attachment = findPreviewedAttachment(downloadControl);
            if (!attachment) {
                return;
            }
            downloadControl.dataset.okdeskAttachmentCopyAttached = 'true';
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.textContent = 'Скопировать ссылку';
            copyButton.title = 'Скопировать ссылку из narod_attachment_links.html в буфер обмена';
            Object.assign(copyButton.style, {
                marginLeft: '8px', padding: '8px 12px', border: '1px solid #4f8a63', borderRadius: '4px',
                background: 'var(--okdesk-script-primary-alt2)', color: 'var(--okdesk-script-text)', cursor: 'pointer', fontSize: '13px',
            });
            copyButton.addEventListener('click', async () => {
                try {
                    copyButton.disabled = true;
                    copyButton.textContent = 'Чтение ссылки...';
                    const links = await extractLinksFromAttachment(issueId, attachment, token);
                    if (!links.length) {
                        throw new Error('в файле не найдены внешние ссылки');
                    }
                    if (links.length === 1) {
                        await copyTextToClipboard(links[0]);
                        showToast('Ссылка скопирована в буфер обмена.');
                    } else {
                        showAttachmentLinkPicker(links, 'Выберите ссылку для копирования', async (url) => {
                            await copyTextToClipboard(url);
                            return 'Ссылка скопирована в буфер обмена.';
                        });
                    }
                } catch (error) {
                    console.error('Okdesk attachment link copy:', error);
                    showToast(`Не удалось скопировать ссылку: ${error.message}`, true);
                } finally {
                    copyButton.disabled = false;
                    copyButton.textContent = 'Скопировать ссылку';
                }
            });
            downloadControl.insertAdjacentElement('afterend', copyButton);

            const addCommentButton = document.createElement('button');
            addCommentButton.type = 'button';
            addCommentButton.textContent = 'Добавить скрытым комментарием';
            addCommentButton.title = 'Добавить ссылку из narod_attachment_links.html скрытым комментарием';
            Object.assign(addCommentButton.style, {
                marginLeft: '8px', padding: '8px 12px', border: '1px solid #426f9f', borderRadius: '4px',
                background: 'var(--okdesk-script-secondary)', color: 'var(--okdesk-script-text)', cursor: 'pointer', fontSize: '13px',
            });
            const addAndReload = async (url) => {
                await addAttachmentLinkAsPrivateComment(issueId, url);
                window.setTimeout(() => window.location.reload(), 700);
                return 'Ссылка добавлена скрытым комментарием. Страница обновляется.';
            };
            addCommentButton.addEventListener('click', async () => {
                try {
                    addCommentButton.disabled = true;
                    addCommentButton.textContent = 'Добавление...';
                    const links = await extractLinksFromAttachment(issueId, attachment, token);
                    if (!links.length) {
                        throw new Error('в файле не найдены внешние ссылки');
                    }
                    if (links.length === 1) {
                        showToast(await addAndReload(links[0]));
                    } else {
                        showAttachmentLinkPicker(links, 'Выберите ссылку для скрытого комментария', addAndReload);
                    }
                } catch (error) {
                    console.error('Okdesk attachment link comment:', error);
                    showToast(`Не удалось добавить ссылку: ${error.message}`, true);
                    addCommentButton.disabled = false;
                    addCommentButton.textContent = 'Добавить скрытым комментарием';
                }
            });
            copyButton.insertAdjacentElement('afterend', addCommentButton);
        });
    }

    function findPreviewedAttachment(control) {
        const ancestors = [];
        for (let element = control.parentElement; element && element !== document.body; element = element.parentElement) {
            ancestors.push(element);
        }
        for (const attachment of attachmentLinkFiles.values()) {
            if (ancestors.some((element) => element.textContent?.includes(attachment.attachment_file_name))) {
                return attachment;
            }
        }
        return null;
    }

    function showVideoMenu(x, y, issueId, attachment, token) {
        hideMenus();
        ensureContextMenuHoverStyle();
        menu = document.createElement('div');
        menu.id = 'okdesk-field-filler-menu';
        menu.innerHTML = `
            <button data-action="play">Просмотреть в браузере</button>
            <button data-action="download">Скачать видео</button>
        `;
        Object.assign(menu.style, {
            position: 'fixed', zIndex: '2147483647', left: `${x}px`, top: `${y}px`,
            minWidth: '220px', padding: '6px', border: '1px solid var(--okdesk-script-border-menu)', borderRadius: '6px',
            background: 'var(--okdesk-script-surface)', boxShadow: '0 8px 24px rgba(0,0,0,.35)', userSelect: 'none',
        });
        menu.querySelectorAll('button').forEach((button) => {
            Object.assign(button.style, {
                display: 'block', width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '0', background: 'transparent',
                color: 'var(--okdesk-script-text)', textAlign: 'left', cursor: 'pointer',
            });
            button.addEventListener('click', async () => {
                const action = button.dataset.action;
                hideContextMenu();
                if (action === 'play') {
                    await openVideoInBrowser(issueId, attachment, token);
                } else {
                    const url = await getAttachmentUrl(issueId, attachment.id, token);
                    triggerDownload(url, attachment.attachment_file_name || `video-${attachment.id}`);
                }
            });
        });
        document.body.appendChild(menu);
        keepMenuInViewport(menu, x, y);
    }

    async function openVideoInBrowser(issueId, attachment, token) {
        try {
            const url = await getAttachmentUrl(issueId, attachment.id, token);
            window.open(url, '_blank', 'noopener');
        } catch (error) {
            console.error('Okdesk video open:', error);
            showToast('Не удалось открыть видео.', true);
        }
    }

    async function getApiJson(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }

    async function getAttachmentUrl(issueId, attachmentId, token) {
        const apiUrl = `/api/v1/issues/${issueId}/attachments/${attachmentId}?api_token=${encodeURIComponent(token)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Attachment HTTP ${response.status}`);
        }
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const payload = await response.json();
            if (payload.attachment_url) {
                return payload.attachment_url;
            }
        }
        return apiUrl;
    }

    function triggerDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function handleSendContextMenu(event) {
        const control = event.target.closest('button, input[type="submit"], a');
        if (!control || !isCommentSendControl(control)) {
            return;
        }
        if (!hasCommentText()) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        showSendMenu(event.clientX, event.clientY, control);
    }

    function showSendMenu(x, y, control) {
        hideMenus();
        ensureContextMenuHoverStyle();
        menu = document.createElement('div');
        menu.id = 'okdesk-field-filler-menu';
        menu.addEventListener('click', (event) => event.stopPropagation());
        const statuses = getSavedIssueStatuses();
        const statusButtons = statuses.map((status) =>
            `<button data-status="${escapeHtml(status.code)}">Отправить и «${escapeHtml(status.name)}»</button>`
        ).join('');
        menu.innerHTML = `
            <button data-status="">Отправить без смены статуса</button>
            ${statusButtons ? `<hr>${statusButtons}` : ''}
            <hr>
            <button data-action="transfer">↪ Отправить сотруднику и сменить ответственного</button>
        `;
        Object.assign(menu.style, {
            position: 'fixed', zIndex: '2147483647', left: `${x}px`, top: `${y}px`,
            minWidth: '350px', padding: '6px', border: '1px solid var(--okdesk-script-border-menu)',
            borderRadius: '6px', background: 'var(--okdesk-script-surface)', boxShadow: '0 8px 24px rgba(0,0,0,.35)', userSelect: 'none',
        });
        menu.querySelectorAll('button').forEach((button) => {
            Object.assign(button.style, {
                display: 'block', width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '0',
                background: 'transparent', color: 'var(--okdesk-script-text)', textAlign: 'left', cursor: 'pointer',
            });
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (button.dataset.action === 'transfer') {
                    window.setTimeout(() => showTransferMenu(x, y, control), 0);
                    return;
                }
                queuedStatusCode = button.dataset.status;
                hideContextMenu();
                control.click();
            });
        });
        menu.querySelectorAll('hr').forEach((divider) => { divider.style.borderColor = 'var(--okdesk-script-divider)'; });
        document.body.appendChild(menu);
        keepMenuInViewport(menu, x, y);
    }

    async function showTransferMenu(x, y, control) {
        hideMenus();
        ensureContextMenuHoverStyle();
        menu = document.createElement('div');
        menu.id = 'okdesk-field-filler-menu';
        menu.addEventListener('click', (event) => event.stopPropagation());
        Object.assign(menu.style, {
            position: 'fixed', zIndex: '2147483647', left: `${x}px`, top: `${y}px`, minWidth: '330px',
            padding: '10px', border: '1px solid var(--okdesk-script-border-menu)', borderRadius: '6px', background: 'var(--okdesk-script-surface)',
            color: 'var(--okdesk-script-text)', boxShadow: '0 8px 24px rgba(0,0,0,.35)', font: '14px Arial,sans-serif', userSelect: 'none',
        });
        menu.textContent = 'Загрузка сотрудников группы...';
        document.body.appendChild(menu);
        keepMenuInViewport(menu, x, y);
        try {
            const employees = await getTransferEmployees();
            if (!menu?.isConnected) {
                return;
            }
            menu.replaceChildren();
            const title = document.createElement('div');
            title.textContent = 'Отправить скрытым комментарием и передать заявку:';
            title.style.marginBottom = '8px';
            const list = document.createElement('div');
            Object.assign(list.style, { maxHeight: '510px', overflowY: 'auto' });
            employees.forEach((employee) => {
                const employeeButton = document.createElement('button');
                employeeButton.textContent = `${employee.name} (ID ${employee.id})`;
                Object.assign(employeeButton.style, { display: 'block', width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '0', background: 'transparent', color: 'var(--okdesk-script-text)', textAlign: 'left', cursor: 'pointer' });
                employeeButton.addEventListener('click', async () => {
                    list.querySelectorAll('button').forEach((button) => { button.disabled = true; });
                    try {
                        await sendPrivateCommentAndTransfer(employee, control);
                    } catch (error) {
                        showToast(`Не удалось передать заявку: ${error.message}`, true);
                        list.querySelectorAll('button').forEach((button) => { button.disabled = false; });
                    }
                });
                list.appendChild(employeeButton);
            });
            const close = document.createElement('button');
            close.textContent = 'Отмена';
            Object.assign(close.style, { marginTop: '8px', padding: '7px 10px', border: '1px solid var(--okdesk-script-border-menu)', borderRadius: '4px', background: 'var(--okdesk-script-raised)', color: 'var(--okdesk-script-text)', cursor: 'pointer' });
            close.onclick = hideContextMenu;
            const divider = document.createElement('div');
            Object.assign(divider.style, { margin: '8px 4px 0', borderTop: '1px solid var(--okdesk-script-divider)' });
            menu.append(title, list, divider, close);
            keepMenuInViewport(menu, x, y);
        } catch (error) {
            if (menu?.isConnected) {
                menu.textContent = `Не удалось загрузить сотрудников: ${error.message}`;
            }
        }
    }

    async function getTransferEmployees() {
        if (transferEmployeesCache) {
            return transferEmployeesCache;
        }
        const settings = getTransferSettings();
        if (!settings.groupId) {
            throw new Error('в настройках передачи выберите группу сотрудников');
        }
        const employees = settings.employees.length
            ? normalizeEmployees(settings.employees)
            : await loadGroupEmployees(settings.groupId);
        if (!employees.length) {
            throw new Error('в указанной группе нет активных сотрудников');
        }
        transferEmployeesCache = employees;
        return employees;
    }

    async function loadGroupEmployees(groupId) {
        const groups = await apiRequest('/employees/groups');
        const group = (Array.isArray(groups) ? groups : []).find((item) => Number(item.id) === Number(groupId));
        if (!group) {
            throw new Error(`группа с ID ${groupId} не найдена`);
        }
        return normalizeEmployees(group.employees || []);
    }

    async function sendPrivateCommentAndTransfer(employee, control) {
        const issueId = getIssueId();
        if (!issueId) {
            throw new Error('не удалось определить номер заявки');
        }
        const settings = getTransferSettings();
        const authorId = await getPrivateCommentAuthorId(settings);
        if (!settings.groupId) {
            throw new Error('в настройках передачи выберите группу сотрудников');
        }
        const commentHtml = getCommentHtml(control);
        if (!stripHtml(commentHtml)) {
            throw new Error('текст комментария пуст');
        }
        if (hasPendingCommentAttachments()) {
            throw new Error('к комментарию прикреплён файл. Для сохранения вложения отправьте комментарий штатной кнопкой Okdesk');
        }
        const mention = `<span>[~employee${employee.id}|${escapeHtml(employee.name)}]</span>&zwj;&nbsp;`;
        const content = `${commentHtml}<br>${mention}`;
        appendMentionToEditor(mention, control);
        hideContextMenu();
        showToast(`Отправляю скрытый комментарий и передаю заявку: ${employee.name}.`);
        await apiRequest(`/issues/${issueId}/comments`, {
            method: 'POST',
            body: {
                comment: {
                    content,
                    public: false,
                    author_id: authorId,
                    author_type: 'employee',
                },
            },
        });
        await apiRequest(`/issues/${issueId}/assignees`, {
            method: 'PATCH',
            body: { assignee_id: employee.id, group_id: settings.groupId },
        });
        clearCommentEditor(control);
        showToast(`Заявка передана сотруднику: ${employee.name}.`);
        if (GM_getValue(RELOAD_AFTER_UPDATE_KEY, true)) {
            window.setTimeout(() => location.reload(), 700);
        }
    }

    async function handleCommentSend(event) {
        const control = event.target.closest('button, input[type="submit"], a');
        if (!control || pendingStatusChange || !isCommentSendControl(control)) {
            return;
        }

        const statusCode = queuedStatusCode;
        if (!statusCode || !hasCommentText()) {
            queuedStatusCode = '';
            return;
        }

        const token = GM_getValue(API_TOKEN_KEY, '');
        if (!token) {
            showToast('Статус не изменён: сначала укажите API-токен Okdesk.', true);
            queuedStatusCode = '';
            return;
        }

        const issueId = getIssueId();
        if (!issueId) {
            return;
        }

        pendingStatusChange = true;
        const sentAt = Date.now();
        showToast('Ожидаю успешную отправку комментария для смены статуса.');
        try {
            const sent = await waitForNewComment(issueId, token, sentAt);
            if (!sent) {
                showToast('Комментарий не подтверждён. Статус не изменён.', true);
                return;
            }
            await changeStatus(issueId, token, statusCode);
            showToast('Комментарий отправлен, статус изменён.');
            queuedStatusCode = '';
            if (GM_getValue(RELOAD_AFTER_UPDATE_KEY, true)) {
                window.setTimeout(() => location.reload(), 700);
            }
        } catch (error) {
            console.error('Okdesk status change:', error);
            showToast('Комментарий отправлен, но сменить статус не удалось. Проверьте права доступа.', true);
        } finally {
            pendingStatusChange = false;
            queuedStatusCode = '';
        }
    }

    function isCommentSendControl(control) {
        const label = (control.innerText || control.value || '').trim().toLowerCase();
        return /^(отправить|добавить комментарий|оставить комментарий)$/.test(label);
    }

    function hasCommentText() {
        return Boolean(stripHtml(getCommentHtml()));
    }

    function isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
    }

    function findCommentEditor() {
        const frames = [...document.querySelectorAll('iframe.cke_wysiwyg_frame')]
            .filter((iframe) => isVisible(iframe) && iframe.contentDocument?.body?.innerText.trim());
        if (frames.length) {
            return { type: 'iframe', element: frames.at(-1), body: frames.at(-1).contentDocument.body };
        }
        const editors = [...document.querySelectorAll('textarea, [contenteditable="true"]')]
            .filter((element) => isVisible(element) && (element.value ?? element.innerText ?? '').trim());
        return editors.length ? { type: 'element', element: editors.at(-1) } : null;
    }

    function findWritableCommentEditor() {
        const frames = [...document.querySelectorAll('iframe.cke_wysiwyg_frame')]
            .filter((iframe) => isVisible(iframe) && iframe.contentDocument?.body);
        if (frames.length) {
            return { type: 'iframe', element: frames.at(-1), body: frames.at(-1).contentDocument.body };
        }
        const editors = [...document.querySelectorAll('textarea, [contenteditable="true"]')]
            .filter((element) => isVisible(element));
        return editors.length ? { type: 'element', element: editors.at(-1) } : null;
    }

    function appendFormattedTextToComment(text, type) {
        const editor = findWritableCommentEditor();
        if (!editor) {
            showToast('Не найден редактор комментария. Откройте поле ответа и повторите.', true);
            return;
        }
        const html = type === 'spoiler' ? createSpoilerHtml(text) : createQuoteHtml(text);
        if (editor.type === 'iframe') {
            editor.body.focus();
            editor.body.insertAdjacentHTML('beforeend', html);
            editor.body.dispatchEvent(new Event('input', { bubbles: true }));
            editor.body.dispatchEvent(new Event('change', { bubbles: true }));
            showToast(type === 'spoiler' ? 'Спойлер добавлен в комментарий.' : 'Цитата добавлена в комментарий.');
            return;
        }
        const { element } = editor;
        if ('value' in element) {
            element.value += html;
        } else {
            element.insertAdjacentHTML('beforeend', html);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        showToast(type === 'spoiler' ? 'Спойлер добавлен в комментарий.' : 'Цитата добавлена в комментарий.');
    }

    function getCommentHtml() {
        const editor = findCommentEditor();
        if (!editor) {
            return '';
        }
        if (editor.type === 'iframe') {
            return editor.body.innerHTML.trim();
        }
        return 'value' in editor.element
            ? escapeHtml(editor.element.value).replace(/\r?\n/g, '<br>')
            : editor.element.innerHTML;
    }

    function stripHtml(html) {
        const container = document.createElement('div');
        container.innerHTML = html;
        return container.textContent?.trim() || '';
    }

    function appendMentionToEditor(mention) {
        const editor = findCommentEditor();
        if (!editor) {
            return;
        }
        if (editor.type === 'iframe') {
            const { body } = editor;
            body.insertAdjacentHTML('beforeend', `<br>${mention}`);
            body.dispatchEvent(new Event('input', { bubbles: true }));
            body.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        const { element } = editor;
        if ('value' in element) {
            element.value += `\n${mention}`;
        } else {
            element.insertAdjacentHTML('beforeend', `<br>${mention}`);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function clearCommentEditor() {
        const editor = findCommentEditor();
        if (!editor) {
            return;
        }
        const element = editor.type === 'iframe' ? editor.body : editor.element;
        if ('value' in element) {
            element.value = '';
        } else {
            element.innerHTML = '';
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function hasPendingCommentAttachments() {
        return [...document.querySelectorAll('input[type="file"]')].some((input) => input.files?.length);
    }

    async function apiRequest(path, options = {}) {
        const token = GM_getValue(API_TOKEN_KEY, '');
        if (!token) {
            throw new Error('укажите API-токен Okdesk в настройках скрипта');
        }
        const separator = path.includes('?') ? '&' : '?';
        const response = await fetch(`/api/v1${path}${separator}api_token=${encodeURIComponent(token)}`, {
            method: options.method || 'GET',
            headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    async function sendManualIssueComment({ issueId, text, isPublic, files = [], statusCode = '', employee = null }) {
        const settings = getTransferSettings();
        if (employee && !settings.groupId) throw new Error('укажите группу сотрудников в настройках передачи');
        const authorId = await getPrivateCommentAuthorId(settings);
        const mention = employee ? `<span>[~employee${employee.id}|${escapeHtml(employee.name)}]</span>&zwj;&nbsp;` : '';
        const content = [formatQuickReplyContent(text), mention].filter(Boolean).join('<br>');
        let commentSent = false;
        try {
            if (files.length) {
                const form = new FormData();
                form.append('comment[content]', content);
                form.append('comment[public]', String(Boolean(isPublic && !employee)));
                form.append('comment[author_id]', String(authorId));
                form.append('comment[author_type]', 'employee');
                files.forEach((file, index) => form.append(`comment[attachments][${index}][attachment]`, file, file.name));
                const token = GM_getValue(API_TOKEN_KEY, '');
                const response = await fetch(`/api/v1/issues/${issueId}/comments?api_token=${encodeURIComponent(token)}`, { method: 'POST', body: form });
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            } else {
                await apiRequest(`/issues/${issueId}/comments`, {
                    method: 'POST',
                    body: { comment: { content, public: Boolean(isPublic && !employee), author_id: authorId, author_type: 'employee' } },
                });
            }
            commentSent = true;
            if (employee) {
                await apiRequest(`/issues/${issueId}/assignees`, { method: 'PATCH', body: { assignee_id: employee.id, group_id: settings.groupId } });
            } else if (statusCode && !await isIssueAlreadyInStatus(issueId, statusCode)) {
                await changeStatus(issueId, GM_getValue(API_TOKEN_KEY, ''), statusCode);
            }
        } catch (error) {
            if (commentSent) error.commentSent = true;
            throw error;
        }
    }

    async function waitForNewComment(issueId, token, sentAt) {
        for (const delay of [1200, 1800, 2500, 3500]) {
            await sleep(delay);
            const response = await fetch(`/api/v1/issues/${issueId}?api_token=${encodeURIComponent(token)}`);
            if (!response.ok) {
                continue;
            }
            const issue = await response.json();
            const lastCommentAt = Date.parse(issue.comments?.last_at || '');
            if (Number.isFinite(lastCommentAt) && lastCommentAt >= sentAt - 5000) {
                return true;
            }
        }
        return false;
    }

    async function changeStatus(issueId, token, code) {
        const response = await fetch(`/api/v1/issues/${issueId}/statuses?api_token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
    }

    function sleep(milliseconds) {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }

    async function updateParameter(issueId, code, value, label) {
        const token = GM_getValue(API_TOKEN_KEY, '');
        if (!token) {
            showToast('Сначала укажите API-токен в меню Tampermonkey.', true);
            return;
        }

        try {
            const response = await fetch(`/api/v1/issues/${issueId}/parameters?api_token=${encodeURIComponent(token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_parameters: { [code]: value } }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            showToast(`Поле «${label}» обновлено.`);
            if (GM_getValue(RELOAD_AFTER_UPDATE_KEY, true)) {
                window.setTimeout(() => location.reload(), 700);
            }
        } catch (error) {
            console.error('Okdesk field filler:', error);
            showToast(`Не удалось обновить поле «${label}». Проверьте API-токен и права доступа.`, true);
        }
    }

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed', zIndex: '2147483647', right: '20px', bottom: '20px',
            maxWidth: '440px', padding: '12px 16px', borderRadius: '6px', color: '#fff',
            background: isError ? '#b3261e' : '#197a3e', boxShadow: '0 6px 20px rgba(0,0,0,.3)',
        });
        document.body.appendChild(toast);
        window.setTimeout(() => toast.remove(), 4500);
    }
})();
