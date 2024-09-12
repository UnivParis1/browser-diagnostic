function ua_to_name_version(ua) {
    let m = ua.match(/(Firefox|Chrome|CriOS|EdgiOS|Safari|SamsungBrowser)\/(\d+)/) || []
    let resp = { name: m[1], major: m[2] }
    if (resp.name === 'CriOS') {
        resp.name = 'Chrome_iOS'
    }
    if (resp.name === 'EdgiOS') {
        resp.name = 'Edge_iOS'
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

function parse_user_agent(ua) {
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
    } else if (resp.name === 'Edge_iOS') {
        clean_ua = clean_ua.replace(/ Version[/][\d.]+ Mobile[/][\w]+ /, ' ')
    } else if (resp.name === 'Firefox') {
        clean_ua = clean_ua.replace(/; rv:[\d.]+/, '')
        clean_ua = clean_ua.replace(/Gecko\/[\d.]+ /, '')
    }
    resp.clean_ua = clean_ua
    return resp
}

if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = parse_user_agent
}
