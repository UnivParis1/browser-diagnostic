
curl -s https://endoflife.date/api/firefox.json | jq . > firefox-versions.json

(perl -lne '$t = /^chrome:/ ... /\]/; print if $t > 1' browser-releaseDates.js ;
 curl -s https://raw.githubusercontent.com/berstend/chrome-versions/master/data/stable/windows/version/list.json ) | jq -r -s '.[0] + .[1] | unique_by(.version) | reverse' > chrome-versions.json

(perl -lne '$t = /^safari:/ ... /\}/; print if $t > 1' browser-releaseDates.js ;
 curl -sL https://support.apple.com/en-us/HT201222 | perl -MJSON -lne 'while (m!<tr>(.*?)</tr>!g) { $l = $1; if ($l =~ /Safari ([\d.]*)/) { $v = $1; $l =~ m!>(\d\d \w\w\w \d\d\d\d)<! and $h{$v} = $1 } } END { print encode_json(\%h) }') | jq -r -s --sort-keys '.[0] + .[1]' > safari-versions.json

(perl -lne '$t = /^samsungbrowser:/ ... /\}/; print if $t > 1' browser-releaseDates.js ;
 curl -s https://apkpure.fr/fr/samsung-internet-browser/com.sec.android.app.sbrowser/versions | perl -MJSON -lne 'if (/data-dt-version="([^"]*)"/) { $v = $1 } elsif (m!"update-on">([^<]*)</span>! && $v) { $h{$v} = $1; $v = "" } END { print encode_json(\%h) }') | jq -r -s --sort-keys '.[0] + .[1]' > samsungbrowser-versions.json

curl -s https://raw.githubusercontent.com/MicrosoftDocs/Edge-Enterprise/public/edgeenterprise/microsoft-edge-release-schedule.md | perl -MJSON -lne 'if (/[|]\s*Release/) { @one = map { s/<.*//; $_ } split /\s*[|]\s*/; $one[4] =~ s/Week of //; push @l, { milestone => $one[1], date => $one[4], $one[5] =~ /-.*-\d\d\d\d/ ? (isExtended => JSON::true) : () } } END { print encode_json(\@l) }' | jq --sort-keys > edge-versions.json

(echo "browser_releaseDates = {"
for i in firefox chrome safari samsungbrowser edge; do 
    echo "$i: "; cat $i-versions.json ; echo ; echo ","
done
echo "}"
echo 'if (typeof module === "object" && typeof module.exports === "object") { module.exports = browser_releaseDates }'
) > browser-releaseDates.js
