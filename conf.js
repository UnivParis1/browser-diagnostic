function after_compute_msgs(msgs, _level, app, _ua, _now) {
    const suggestions = {
        'CFilex': `Vous pouvez aussi essayer le service <a href='https://filesender.renater.fr/'>https://filesender.renater.fr/</a> qui ne nécessite pas un navigateur récent.`,
    }
    
    const suggestion = suggestions[app]
    if (suggestion) msgs.push("<i>" + suggestion + "</i>")
}

