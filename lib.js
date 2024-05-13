function escapeHTML(str) {
    return new Option(str).innerHTML;
}

function addDays(date, days) {
    let r = new Date(date);
    r.setTime(r.getTime() + days * 60 * 60 * 24 * 1000);
    return r;
}

function version_compare(v1, v2) {
    return (""+v1).localeCompare(""+v2, undefined, { numeric: true })
}

function new_date(date) {
    return date && new Date(date) || null
}

function ua_to_name_version(ua) {
    let m = ua.match(/(Firefox|Chrome|CriOS|Safari|SamsungBrowser)\/(\d+)/) || []
    let resp = { name: m[1], major: m[2] }
    if (resp.name === 'CriOS') {
        resp.name = 'Chrome_iOS'
    }
    if (resp.name === 'Chrome') {
        m = ua.match(/Edg\/(\d+)/)
        if (m) {
            resp = { name: 'Edge', major: m[1] }
        }
    }
    if (resp.name === 'Safari') {
        m = ua.match(/Version\/(\d+)[.](\d+)(\S*)/) || []
        resp.major = m[1]
        resp.version = m[1] + "." + m[2]
        resp.full_version = resp.version + m[3]
    }
    return resp
}

function add_chrome_edge_eol(resp) {
    // Refs : https://chromium.googlesource.com/chromium/src/+/master/docs/process/release_cycle.md https://learn.microsoft.com/en-us/deployedge/microsoft-edge-release-schedule
    let isExtended = parseInt(resp.major) % 2 === 0
    resp.eol = addDays(resp.firstReleaseDate, (isExtended ? 8 : 4) /*weeks*/ * 7)
    if (isExtended) resp.isExtended = true
}

function get_browser_info(browser_releaseDates, ua) {
    let resp = ua_to_name_version(ua)
    let clean_ua = ua
        .replace(/^Mozilla[/]5[.]0 /, '')
        .replace(' (KHTML, like Gecko)', '')
        .replace(' like Mac OS X', '')
        .replace(' Gecko/20100101', '')
        .replace(/ AppleWebKit[/][\d.]+/, '')
        .replace('Macintosh; Intel Mac OS X 10_15_7', 'Intel Mac OS X')
        .replace('Macintosh; Intel Mac OS X 10.15', 'Intel Mac OS X')
        .replace('Macintosh; Intel Mac OS X', 'Intel Mac OS X')
        .replace('Windows NT 10.0', 'Windows')
        .replace('X11; CrOS x86_64 14541.0.0', 'CrOS x86_64')
        .replace('Win64; x64', 'x64')
        .replace('Linux; Android 10; K)', 'Android)')
        .replace('.0.0.0', '')
    if (resp.name === 'Chrome') {
        clean_ua = clean_ua.replace(/ Safari[/][\d.]+/, '')
    } else if (resp.name === 'Edge') {
        clean_ua = clean_ua.replace(/ Safari[/][\d.]+/, '')
        clean_ua = clean_ua.replace(/ Chrome[/][\d.]+/, '')
        clean_ua = clean_ua.replace(/[.]0[.]0[.]$/, '')
    } else if (resp.name === 'SamsungBrowser') {
        clean_ua = clean_ua.replace(/ Safari[/][\d.]+/, '')
        clean_ua = clean_ua.replace(/ Chrome[/][\d.]+/, '')
        clean_ua = clean_ua.replace(/[.]0$/, '')
        clean_ua = clean_ua.replace(' Mobile', '')
    } else if (resp.name === 'Safari') {
        clean_ua = clean_ua.replace(/; CPU iPhone OS [\d_]+/, '')
        clean_ua = clean_ua.replace(/ Mobile[/][\w]+ /, ' ')
         
        clean_ua = clean_ua.replace(/Version[/]([\d.]+ Safari)[/][\d.]+/, '$1')
    } else if (resp.name === 'Chrome_iOS') {
        clean_ua = clean_ua.replace(/; CPU iPhone OS [\d_]+/, '')
        clean_ua = clean_ua.replace(/ Mobile[/][\w]+ /, ' ')
    } else if (resp.name === 'Firefox') {
        clean_ua = clean_ua.replace(/; rv:[\d.]+/, '')
        clean_ua = clean_ua.replace(/Gecko\/[\d.]+ /, '')
    }
    resp.clean_ua = clean_ua

    let major = parseFloat(resp.major)
    if (resp.name === 'Firefox') {
        // https://endoflife.date/firefox
        let info = browser_releaseDates.firefox.find(info => info.cycle === resp.major)
        if (info) {
            resp.firstReleaseDate = new Date(info.releaseDate)
            resp.latestReleaseDate = new Date(info.latestReleaseDate)
            resp.eol = new_date(info.eol)
        }
        if (major <= 78 && ua.match(/Mac OS X/)) {        
            // https://www.mozilla.org/en-US/firefox/78.0/system-requirements/
            resp.suggest_macos_upgrade = true
        } else if (major < 78) {
            resp.old_info = 'depuis au moins 3 ans'
        }
        // encore un peu de temps pour les Windows 7-8 grace à l'ESR : https://www.mozilla.org/en-US/firefox/115.0esr/system-requirements/
    } else if (resp.name === 'Chrome' || resp.name === 'Chrome_iOS') {
        let matches = browser_releaseDates.chrome.filter(info => info.milestone === major)
        if (!matches.length) {
            // fallback on Edge dates which are mostly the same!
            matches = browser_releaseDates.edge.filter(info => info.milestone === major)
        }
        if (matches.length) {
            let dates = matches.map(info => new Date(info.date))
            resp.firstReleaseDate = new Date(Math.min.apply(null, dates))
            resp.latestReleaseDate = new Date(Math.max.apply(null, dates))
            add_chrome_edge_eol(resp)
        } else if (major < 101) {
            resp.old_info = 'depuis au moins 2 ans'
        } else if (major < 121) {
            resp.old_info = 'depuis au moins 6 mois'
        }
        if (major <= 109 && ua.match(/Win64/)) {        
            // https://support.google.com/chrome/a/answer/7100626?hl=en
            resp.suggest_windows_firefox_ESR = true
        }
        if (major <= 117 && ua.match(/Mac OS X/)) {        
            resp.suggest_macos_upgrade = true
        }
    } else if (resp.name === 'Edge') {
        let info = browser_releaseDates.edge.find(info => info.milestone === resp.major)
        if (info) {
            resp.firstReleaseDate = new Date(info.date)
            add_chrome_edge_eol(resp)
        }
    } else if (resp.name === 'Safari') {
        let versions = Object.keys(browser_releaseDates.safari).filter(v => (
            version_compare(resp.major, v) <= 0 && version_compare(resp.full_version, v) >= 0
        ))
        if (versions.length) {
            let dates = versions.map(v => new Date(browser_releaseDates.safari[v]))
            resp.firstReleaseDate = new Date(Math.min.apply(null, dates))
            resp.latestReleaseDate = new Date(Math.max.apply(null, dates))
        }
        if (15 <= major && major <= 16 && !ua.match('Mobile/')) {
            // Chrome & Firefox sont dispo sur MacOS >= 10.15 (Catalina)
            // Un MacOS Catalina à jour a Safari 15 (mais un MacOS Catalina non à jour aura Safari >= 13)
            resp.suggest_macos_firefox_chrome = true
        } else if (major < 15 && !ua.match('Mobile/')) {
            resp.suggest_macos_upgrade = true
        }
    } else if (resp.name === 'SamsungBrowser') {
        let versions = Object.keys(browser_releaseDates.samsungbrowser).filter(v => (
            version_compare(major, v) <= 0 && version_compare(major + 1, v) >= 0
        ))
        if (versions.length) {
            let dates = versions.map(v => new Date(browser_releaseDates.samsungbrowser[v]))
            resp.firstReleaseDate = new Date(Math.min.apply(null, dates))
            resp.latestReleaseDate = new Date(Math.max.apply(null, dates))
        }
    }
    return resp
}

function compute_browser_warnings(require, ua_info, now) {

    let msgs = []
    let os_msgs = []
    if (ua_info.suggest_macos_upgrade) {
        // Safari / MacOS versions : https://support.apple.com/en-us/HT201222
        // Voir aussi https://endoflife.date/macos
        os_msgs.push(`
            Si vous avez un MacOS &lt; 10.15 <small>(Mojave, *Sierra, El Capitan, Yosemite)</small>, 
            la seule solution pour avoir un navigateur à jour est la mise à jour de votre système d'exploitation.
        `)
    }

    if (ua_info.suggest_macos_upgrade || ua_info.suggest_macos_firefox_chrome) {
        os_msgs.push(`
            Si vous avez un MacOS 10.15 ou 11 <small>(Catalina, Big Sur)</small>,
            nous vous invitons à mettre à jour votre système d'exploitation. Mais vous pouvez aussi installer les dernières version de Chrome ou Firefox.
        `)
    }
    if (ua_info.suggest_windows_firefox_ESR) {
        os_msgs.push(`
            Si vous avez un Windows 7 ou 8,
            nous vous invitons à mettre à jour votre système d'exploitation. Mais vous pouvez aussi installer Firefox ESR.
        `)
    }

    const one_month = 30
    if (ua_info.eol && addDays(ua_info.eol, one_month) < now) {
        ua_info.old_info = `depuis le ${ua_info.eol.toLocaleDateString()}`
    } 
    if (ua_info.old_info) {
        msgs.push(`
            Votre navigateur n'est pas à jour.
            Les mises à jour de sécurité ne sont plus gérées sur cette version de navigateur (${ua_info.old_info}).
        `)
        os_msgs.push(`
            ${os_msgs.length ? 'Sinon veuillez' : 'Veuillez'} mettre à jour vers une nouvelle version majeure.
        `)
    } else if (ua_info.latestReleaseDate && addDays(ua_info.latestReleaseDate, 6 * one_month) < now) {
        msgs.push(`
            Votre navigateur n'est pas à jour.
            Les mises à jour de sécurité ne semblent plus être gérées sur cette version de navigateur (dernière mise à jour le ${ua_info.latestReleaseDate.toLocaleDateString()}).
        `)
        os_msgs.push(`
            ${os_msgs.length ? 'Sinon veuillez' : 'Veuillez'} mettre à jour vers une nouvelle version majeure.
        `)
    } else if (!os_msgs.length && require === 'recent-browser') {
        msgs.push(`Votre navigateur semble être à jour
        <p></p>
        Communiquez les informations ci-dessous à assistance-dsiun@univ-paris1.fr pour diagnostiquer le problème.
        `)
    }

    return msgs.concat(os_msgs)
}

if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = { get_browser_info: get_browser_info }
}
