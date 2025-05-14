if (typeof module === "object" && typeof module.exports === "object") {
    parse_user_agent = require('parse-user-agent')    
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

function add_chrome_edge_eol(resp) {
    // Refs : https://chromium.googlesource.com/chromium/src/+/master/docs/process/release_cycle.md https://learn.microsoft.com/en-us/deployedge/microsoft-edge-release-schedule
    let isExtended = parseInt(resp.major) % 2 === 0
    resp.eol = addDays(resp.firstReleaseDate, (isExtended ? 8 : 4) /*weeks*/ * 7)
    if (isExtended) resp.isExtended = true
}

function get_browser_info(browser_releaseDates, ua) {
    let resp = parse_user_agent(ua)

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
            resp.suggest_windows_upgrade = true
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
        let major_versions = Object.keys(browser_releaseDates.safari).filter(v => (
            version_compare(major, v) <= 0 && version_compare(major + 1, v) > 0
        ))
        let versions = Object.keys(browser_releaseDates.safari).filter(v => (
            version_compare(major, v) <= 0 && version_compare(resp.full_version, v) >= 0
        ))
        versions.sort(version_compare).reverse()
        if (major_versions.length) {
            let major_dates = major_versions.map(v => new Date(browser_releaseDates.safari[v]))
            resp.firstReleaseDate = new Date(Math.min.apply(null, major_dates))
            resp.latestReleaseDate = new Date(Math.max.apply(null, major_dates))
            if (versions.length) {
                const releaseDate = new Date(browser_releaseDates.safari[versions[0]])
                if (+releaseDate !== +resp.latestReleaseDate) {
                    resp.releaseDate = releaseDate
                }
            }
        }
        if (!ua.match('Mobile/')) {
            // Chrome est dispo sur MacOS >= 11 (Big Sur) https://en.wikipedia.org/wiki/Template:Google_Chrome_release_compatibility
            // Firefox sont dispo sur MacOS >= 10.15 (Catalina) https://www.mozilla.org/en-US/firefox/system-requirements/

            // Un MacOS à jour a :
            // - 18 pour 13(Ventura) / 14(Sonoma)
            // - 17 pour 12(Monterey) / 13(Ventura)
            // - 16 pour 11(Big Sur) / 12(Monterey)
            // - 15 pour 10.15(Catalina) / 11(Big Sur)
            if (major >= 18) {
                // ok
            } else if (major >= 16) {
                resp.suggest_macos_firefox_chrome = true
            } else if (major >= 15) {
                resp.suggest_macos_firefox = true
            } else {
                resp.suggest_macos_upgrade = true
            }
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

function weird_cookies() {
    return document.cookie.split(/; /).filter(s => s.match(/=.* /)).map(s => s.split("=")[0])
}
function remove_weird_cookies() {
    const domain = (document.location.hostname.match(/.*([.].*[.].*)/) || [])[1]
    for (const name of weird_cookies()) {
        document.cookie = name + "=; max-age=0; path=/; domain=" + domain
    }
    document.location.reload();
}
function weird_cookie_warning() {
    const names = weird_cookies()
    return names.length ? `
        Vous avez un cookie « ${names[0]} » avec une valeur étrange. Cela peut poser des problèmes à certaines applications (<a href="https://github.com/IdentityPython/SATOSA/issues/468">exemple</a>).
        <p></p>
        <button onclick="remove_weird_cookies()">Essayer de le supprimer</button>
    ` : null
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

    if (ua_info.suggest_macos_upgrade || ua_info.suggest_macos_firefox) {
        os_msgs.push(`
            Si vous avez un MacOS 10.15 <small>(Catalina)</small>,
            nous vous invitons à mettre à jour votre système d'exploitation. Mais vous pouvez aussi installer les dernières version de Firefox.
        `)
    }
    if (ua_info.suggest_macos_upgrade || ua_info.suggest_macos_firefox_chrome) {
        os_msgs.push(`
            Si vous avez un MacOS 11/12/13 <small>(Big Sur, Monterey, Ventura)</small>,
            nous vous invitons à mettre à jour votre système d'exploitation. Mais vous pouvez aussi installer les dernières version de Chrome ou Firefox.
        `)
    }
    if (ua_info.suggest_windows_upgrade) {
        os_msgs.push(`
            Si vous avez un Windows 7 ou 8,
            nous vous invitons à mettre à jour votre système d'exploitation.
        `)
    }

    const one_month = 30
    if (ua_info.eol && addDays(ua_info.eol, one_month) < now) {
        ua_info.old_info = `depuis le ${ua_info.eol.toLocaleDateString()}`
    } 
    if (ua_info.old_info) {
        msgs.push(`
            Les mises à jour de sécurité ne sont plus gérées sur cette version de navigateur (${ua_info.old_info}).
        `)
        os_msgs.push(`
            ${os_msgs.length ? 'Sinon veuillez' : 'Veuillez'} mettre à jour vers une nouvelle version majeure.
        `)
    } else if (ua_info.latestReleaseDate && addDays(ua_info.latestReleaseDate, 5 * one_month) < now) {
        msgs.push(`
            Les mises à jour de sécurité ne semblent plus être gérées sur cette version de navigateur (dernière mise à jour le ${ua_info.latestReleaseDate.toLocaleDateString()}).
        `)
        os_msgs.push(`
            ${os_msgs.length ? 'Sinon veuillez' : 'Veuillez'} mettre à jour vers une nouvelle version majeure.
        `)
    } else if (ua_info.latestReleaseDate && ua_info.releaseDate && addDays(ua_info.releaseDate, one_month) < now) {
        msgs.push(`
            Votre navigateur n'est pas à jour.
            Une mise à jour est disponible.
        `)
    } else if (!os_msgs.length && require === 'recent-browser') {
        msgs.push(`Votre navigateur semble être à jour
        <p></p>
        Communiquez les informations ci-dessous à assistance-dsiun@univ-paris1.fr pour diagnostiquer le problème.
        `)
    }

    const weird_cookie_warning_ = weird_cookie_warning()
    if (weird_cookie_warning_) {
        msgs.push(weird_cookie_warning_)
    }

    return msgs.concat(os_msgs)
}

if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = { get_browser_info: get_browser_info }
}
